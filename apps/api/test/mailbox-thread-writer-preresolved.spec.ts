import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db, type MailboxSyncModel as MailboxSync } from "@crm/db";
import type { AgentTriggerService } from "../src/agent/agent-trigger.service";
import { CompanyDirectoryService } from "../src/companies/company-directory.service";
import { ActivityStampService } from "../src/crm/activity-stamp.service";
import { EnrichmentLogService } from "../src/crm/enrichment-log.service";
import { MailboxMatchService } from "../src/mailbox/mailbox-match.service";
import {
	type IncomingMessage,
	ThreadWriterService,
} from "../src/mailbox/thread-writer.service";
import { withDiscardedCrmEvents } from "./agent-trigger.stub";

const suffix = process.env.TEST_RUN_ID ?? "thread-writer-preresolved-spec";
// A domain no company/contact fixture below is ever registered under, so
// that if match.resolve() were mistakenly still invoked, it would find
// nothing (proving preresolved actually bypasses it, not just happens to
// agree with it).
const unmatchedDomain = `unmatched-${suffix}.test`;
const mailbox = `rep-${suffix}@example.test`;
const userId = `user-${suffix}`;

const agent = {
	contactCreated: async () => true,
	companyCreated: async () => undefined,
	withCrmEvents: withDiscardedCrmEvents,
	companyRequested: async () => true,
} as unknown as AgentTriggerService;

const stamp = new ActivityStampService(db);
const directory = new CompanyDirectoryService(agent);
const log = new EnrichmentLogService(db, stamp);
const match = new MailboxMatchService(db, directory, agent, log);
const threads = new ThreadWriterService(db, match, stamp);

let row: MailboxSync;
let companyId: string;
let contactId: string;

function message(
	id: string,
	sentAt: Date,
	rootId: string,
	from = `sender@${unmatchedDomain}`,
): IncomingMessage {
	return {
		rfcMessageId: id,
		rootId,
		subject: "Pricing",
		from: { email: from, name: "Unmatched Sender" },
		recipients: [{ email: mailbox, name: "Test Rep", kind: "to" }],
		body: "Body.",
		sentAt,
		gmailMessageId: null,
		outlookMessageId: null,
		outlookWebLink: null,
	};
}

async function clean() {
	await db.emailThread.deleteMany({
		where: { rootMessageId: { startsWith: `<preresolved-${suffix}` } },
	});
	await db.contact.deleteMany({ where: { email: { endsWith: `@${unmatchedDomain}` } } });
	await db.contact.deleteMany({ where: { email: `known-${suffix}@known.test` } });
	await db.company.deleteMany({ where: { domain: { in: [unmatchedDomain, `known-${suffix}.test`, `other-${suffix}.test`] } } });
	await db.mailboxSync.deleteMany({ where: { userId } });
	await db.user.deleteMany({ where: { id: userId } });
}

beforeAll(async () => {
	await clean();

	await db.user.create({ data: { id: userId, name: "Test Rep", email: mailbox } });
	row = await db.mailboxSync.create({
		data: { userId, source: "gmail", autoCreate: false },
	});

	const company = await db.company.create({
		data: { name: "Preresolved Co", domain: `known-${suffix}.test` },
		select: { id: true },
	});
	companyId = company.id;

	const contact = await db.contact.create({
		data: {
			firstName: "Known",
			lastName: "Contact",
			email: `known-${suffix}@known.test`,
			companyId: company.id,
		},
		select: { id: true },
	});
	contactId = contact.id;
});

afterAll(clean);

describe("store() with preresolved", () => {
	it("writes a brand-new thread using preresolved ids, without calling match.resolve", async () => {
		const stored = await threads.store(
			row,
			{ mailbox, origin: "gmail" },
			message(
				`<preresolved-new-${suffix}@mail.test>`,
				new Date("2026-01-01T10:00:00Z"),
				`<preresolved-${suffix}-root-a@mail.test>`,
			),
			await threads.context(),
			{ companyId, contactId },
		);

		expect(stored).toBe(true);

		const thread = await db.emailThread.findUnique({
			where: { rootMessageId: `<preresolved-${suffix}-root-a@mail.test>` },
			select: { companyId: true, contactId: true },
		});
		expect(thread?.companyId).toBe(companyId);
		expect(thread?.contactId).toBe(contactId);
	});

	it("bails out with false when preresolved is {null, null} on a brand-new thread", async () => {
		const stored = await threads.store(
			row,
			{ mailbox, origin: "gmail" },
			message(
				`<preresolved-nullnull-${suffix}@mail.test>`,
				new Date("2026-01-01T10:00:00Z"),
				`<preresolved-${suffix}-root-b@mail.test>`,
			),
			await threads.context(),
			{ companyId: null, contactId: null },
		);

		expect(stored).toBe(false);
		const thread = await db.emailThread.findUnique({
			where: { rootMessageId: `<preresolved-${suffix}-root-b@mail.test>` },
		});
		expect(thread).toBeNull();
	});
});

describe("store() relink (only ever active when preresolved is passed)", () => {
	it("relinks a thread the live sync stored by company only, and moves the contact's lastActivityAt", async () => {
		// Seed exactly what the live sync leaves for a company-only match:
		// companyId set, contactId null.
		const rfcMessageId = `<preresolved-relink-${suffix}@mail.test>`;
		const rootMessageId = `<preresolved-${suffix}-root-c@mail.test>`;
		const sentAt = new Date("2026-01-05T10:00:00Z");

		const thread = await db.emailThread.create({
			data: {
				rootMessageId,
				subject: "Pricing",
				companyId,
				contactId: null,
				firstMessageAt: sentAt,
				lastMessageAt: sentAt,
				messageCount: 1,
			},
			select: { id: true },
		});
		await db.emailMessage.create({
			data: {
				threadId: thread.id,
				rfcMessageId,
				syncedByUserId: userId,
				direction: "INBOUND",
				fromEmail: `sender@${unmatchedDomain}`,
				fromName: "Unmatched Sender",
				recipients: [],
				subject: "Pricing",
				snippet: "Body.",
				body: "Body.",
				sentAt,
			},
		});
		await db.activity.create({
			data: {
				type: "EMAIL",
				subject: "Pricing",
				body: "Body.",
				occurredAt: sentAt,
				companyId,
				contactId: null,
				createdById: userId,
				emailThreadId: thread.id,
				meta: { synced: true, source: "gmail" },
			},
		});

		// touch() is a monotonic max-update -- reset so this test's older
		// seeded sentAt can prove it moves forward, independent of whatever
		// other tests in this file already bumped it to "now".
		await db.contact.update({
			where: { id: contactId },
			data: { lastActivityAt: null },
		});

		const stored = await threads.store(
			row,
			{ mailbox, origin: "gmail" },
			message(rfcMessageId, sentAt, rootMessageId),
			await threads.context(),
			{ companyId, contactId },
		);

		// Not newly written -- the message already existed -- but relinked.
		expect(stored).toBe(false);

		const relinkedThread = await db.emailThread.findUnique({
			where: { id: thread.id },
			select: { contactId: true, companyId: true },
		});
		expect(relinkedThread?.contactId).toBe(contactId);
		expect(relinkedThread?.companyId).toBe(companyId);

		const activity = await db.activity.findUnique({
			where: { emailThreadId: thread.id },
			select: { contactId: true },
		});
		expect(activity?.contactId).toBe(contactId);

		const after = await db.contact.findUnique({
			where: { id: contactId },
			select: { lastActivityAt: true },
		});
		expect(after?.lastActivityAt).not.toBeNull();
	});

	it("does not overwrite a thread that already has a different contact", async () => {
		const rfcMessageId = `<preresolved-relink-taken-${suffix}@mail.test>`;
		const rootMessageId = `<preresolved-${suffix}-root-d@mail.test>`;
		const sentAt = new Date("2026-01-06T10:00:00Z");

		const otherContact = await db.contact.create({
			data: {
				firstName: "Other",
				lastName: "Contact",
				email: `other-${suffix}@${unmatchedDomain}`,
				companyId,
			},
			select: { id: true },
		});

		const thread = await db.emailThread.create({
			data: {
				rootMessageId,
				subject: "Pricing",
				companyId,
				contactId: otherContact.id,
				firstMessageAt: sentAt,
				lastMessageAt: sentAt,
				messageCount: 1,
			},
			select: { id: true },
		});
		await db.emailMessage.create({
			data: {
				threadId: thread.id,
				rfcMessageId,
				syncedByUserId: userId,
				direction: "INBOUND",
				fromEmail: `sender@${unmatchedDomain}`,
				fromName: "Unmatched Sender",
				recipients: [],
				subject: "Pricing",
				snippet: "Body.",
				body: "Body.",
				sentAt,
			},
		});
		await db.activity.create({
			data: {
				type: "EMAIL",
				subject: "Pricing",
				body: "Body.",
				occurredAt: sentAt,
				companyId,
				contactId: otherContact.id,
				createdById: userId,
				emailThreadId: thread.id,
				meta: { synced: true, source: "gmail" },
			},
		});

		await threads.store(
			row,
			{ mailbox, origin: "gmail" },
			message(rfcMessageId, sentAt, rootMessageId),
			await threads.context(),
			{ companyId, contactId },
		);

		const untouched = await db.emailThread.findUnique({
			where: { id: thread.id },
			select: { contactId: true },
		});
		expect(untouched?.contactId).toBe(otherContact.id);
	});

	it("does not overwrite a thread that belongs to a different company", async () => {
		const otherCompany = await db.company.create({
			data: { name: "Other Co", domain: `other-${suffix}.test` },
			select: { id: true },
		});

		const rfcMessageId = `<preresolved-relink-othercompany-${suffix}@mail.test>`;
		const rootMessageId = `<preresolved-${suffix}-root-e@mail.test>`;
		const sentAt = new Date("2026-01-07T10:00:00Z");

		const thread = await db.emailThread.create({
			data: {
				rootMessageId,
				subject: "Pricing",
				companyId: otherCompany.id,
				contactId: null,
				firstMessageAt: sentAt,
				lastMessageAt: sentAt,
				messageCount: 1,
			},
			select: { id: true },
		});
		await db.emailMessage.create({
			data: {
				threadId: thread.id,
				rfcMessageId,
				syncedByUserId: userId,
				direction: "INBOUND",
				fromEmail: `sender@${unmatchedDomain}`,
				fromName: "Unmatched Sender",
				recipients: [],
				subject: "Pricing",
				snippet: "Body.",
				body: "Body.",
				sentAt,
			},
		});
		await db.activity.create({
			data: {
				type: "EMAIL",
				subject: "Pricing",
				body: "Body.",
				occurredAt: sentAt,
				companyId: otherCompany.id,
				contactId: null,
				createdById: userId,
				emailThreadId: thread.id,
				meta: { synced: true, source: "gmail" },
			},
		});

		await threads.store(
			row,
			{ mailbox, origin: "gmail" },
			message(rfcMessageId, sentAt, rootMessageId),
			await threads.context(),
			{ companyId, contactId },
		);

		const untouched = await db.emailThread.findUnique({
			where: { id: thread.id },
			select: { contactId: true },
		});
		expect(untouched?.contactId).toBeNull();
	});
});
