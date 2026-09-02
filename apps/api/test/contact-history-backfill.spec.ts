import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db, type MailboxSyncModel as MailboxSync } from "@crm/db";
import type { AgentTriggerService } from "../src/agent/agent-trigger.service";
import { CompanyDirectoryService } from "../src/companies/company-directory.service";
import {
	BACKFILL_CALENDAR_MAX_RESULTS,
	BACKFILL_GMAIL_MAX_RESULTS,
	BACKFILL_WINDOW_MONTHS,
	ContactHistoryBackfillService,
} from "../src/contacts/contact-history-backfill.service";
import { ActivityStampService } from "../src/crm/activity-stamp.service";
import { EnrichmentLogService } from "../src/crm/enrichment-log.service";
import { CalendarSyncService } from "../src/google/calendar-sync.service";
import type { CalendarClient, GoogleEvent } from "../src/google/calendar.client";
import type { GmailClient, GmailMessage, MessageList } from "../src/google/gmail.client";
import { MailboxMatchService } from "../src/mailbox/mailbox-match.service";
import type {
	MailboxTokenService,
	TokenResult,
} from "../src/mailbox/mailbox-token.service";
import { SyncStateService } from "../src/mailbox/sync-state.service";
import { ThreadWriterService } from "../src/mailbox/thread-writer.service";
import { withDiscardedCrmEvents } from "./agent-trigger.stub";

const suffix = process.env.TEST_RUN_ID ?? "contact-history-backfill-spec";
const domain = `backfill-${suffix}.test`;
const senderDomain = `sender-${suffix}.test`;

const agent = {
	contactCreated: async () => true,
	companyCreated: async () => undefined,
	withCrmEvents: withDiscardedCrmEvents,
	companyRequested: async () => true,
	meetingSoon: async () => undefined,
} as unknown as AgentTriggerService;

const stamp = new ActivityStampService(db);
const directory = new CompanyDirectoryService(agent);
const log = new EnrichmentLogService(db, stamp);
const match = new MailboxMatchService(db, directory, agent, log);
const state = new SyncStateService(db);
const threads = new ThreadWriterService(db, match, stamp);

function gmailMessage(rfcId: string, from: string, sentAt: Date): GmailMessage {
	return {
		id: `gm-${rfcId}`,
		payload: {
			headers: [
				{ name: "message-id", value: `<${rfcId}>` },
				{ name: "from", value: from },
				{ name: "to", value: "rep@example.test" },
				{ name: "subject", value: "History" },
				{ name: "date", value: sentAt.toUTCString() },
			],
		},
	};
}

type GmailStubOptions = {
	profile?: { outcome: "ok"; data: { emailAddress: string } } | { outcome: "failed"; reason: string; retryable: boolean };
	searchIds?: string[];
	messages?: Record<string, GmailMessage>;
	searchThrows?: boolean;
	captured?: { maxResults?: number; after?: Date; before?: Date };
};

function gmailStub(options: GmailStubOptions): GmailClient {
	return {
		profile: async () =>
			options.profile ?? { outcome: "ok", data: { emailAddress: "rep@example.test" } },
		searchByParticipant: async (
			_token: string,
			args: { email: string; after: Date; before: Date; maxResults?: number },
		) => {
			if (options.captured) {
				options.captured.maxResults = args.maxResults;
				options.captured.after = args.after;
				options.captured.before = args.before;
			}
			if (options.searchThrows) throw new Error("gmail search exploded");
			const messages: MessageList["messages"] = (options.searchIds ?? []).map(
				(id) => ({ id, threadId: id }),
			);
			return { outcome: "ok", data: { messages } };
		},
		getMessage: async (_token: string, id: string) => {
			const found = options.messages?.[id];
			return found
				? { outcome: "ok", data: found }
				: { outcome: "failed", reason: "not found", retryable: false };
		},
	} as unknown as GmailClient;
}

function tokenStub(
	gmail: TokenResult,
	calendar: TokenResult = { outcome: "ok", accessToken: "cal-token" },
): MailboxTokenService {
	return {
		accessTokenFor: async (_userId: string, source: "gmail" | "calendar" | "outlook") =>
			source === "gmail" ? gmail : calendar,
	} as unknown as MailboxTokenService;
}

function calendarClientStub(
	items: GoogleEvent[] = [],
	captured?: { maxResults?: number; timeMin?: string; timeMax?: string },
): CalendarClient {
	return {
		searchByParticipant: async (
			_token: string,
			args: { email: string; timeMin: Date; timeMax: Date; maxResults?: number },
		) => {
			if (captured) {
				captured.maxResults = args.maxResults;
				captured.timeMin = args.timeMin.toISOString();
				captured.timeMax = args.timeMax.toISOString();
			}
			return { outcome: "ok", data: { items } };
		},
	} as unknown as CalendarClient;
}

function calendarEvent(iCalUid: string, organizerEmail: string, startsAt: Date): GoogleEvent {
	return {
		id: `gcal-${iCalUid}`,
		iCalUID: iCalUid,
		status: "confirmed",
		summary: "History meeting",
		organizer: { email: organizerEmail },
		attendees: [{ email: organizerEmail }],
		start: { dateTime: startsAt.toISOString() },
		end: { dateTime: new Date(startsAt.getTime() + 3600_000).toISOString() },
	};
}

function service(gmail: GmailClient, tokens: MailboxTokenService, calendar: CalendarClient) {
	const calendarSync = new CalendarSyncService(
		db,
		calendar,
		tokens,
		match,
		state,
		stamp,
		agent,
	);
	return new ContactHistoryBackfillService(gmail, tokens, state, threads, calendarSync);
}

let companyId: string;
let contactId: string;
let contactEmail: string;
let userId: string;

async function newUserWithSync(id: string): Promise<void> {
	await db.user.create({ data: { id, name: "Test Rep", email: `${id}@example.test` } });
	await db.mailboxSync.create({ data: { userId: id, source: "gmail", autoCreate: false } });
	await db.mailboxSync.create({ data: { userId: id, source: "calendar", autoCreate: false } });
}

async function clean() {
	await db.calendarEvent.deleteMany({ where: { syncedByUserId: { startsWith: `user-${suffix}` } } });
	await db.emailThread.deleteMany({ where: { rootMessageId: { contains: suffix } } });
	await db.contact.deleteMany({ where: { email: { endsWith: `@${domain}` } } });
	await db.company.deleteMany({ where: { domain } });
	await db.mailboxSync.deleteMany({ where: { userId: { startsWith: `user-${suffix}` } } });
	await db.user.deleteMany({ where: { id: { startsWith: `user-${suffix}` } } });
}

beforeAll(async () => {
	await clean();
	const company = await db.company.create({
		data: { name: "History Co", domain },
		select: { id: true },
	});
	companyId = company.id;
	contactEmail = `target@${domain}`;
	const contact = await db.contact.create({
		data: { firstName: "Target", lastName: "Contact", email: contactEmail, companyId },
		select: { id: true },
	});
	contactId = contact.id;
	userId = `user-${suffix}-main`;
	await newUserWithSync(userId);
});

afterAll(clean);

describe("ContactHistoryBackfillService.run()", () => {
	it("writes matching Gmail and Calendar history for the contact", async () => {
		const rfcId = `history-happy-${suffix}@mail.test`;
		const message = gmailMessage(rfcId, `sender@${senderDomain}`, new Date("2026-02-01T10:00:00Z"));
		const svc = service(
			gmailStub({ searchIds: [message.id as string], messages: { [message.id as string]: message } }),
			tokenStub({ outcome: "ok", accessToken: "gmail-token" }),
			calendarClientStub([
				calendarEvent(`ical-happy-${suffix}`, `organizer@${senderDomain}`, new Date("2026-02-02T10:00:00Z")),
			]),
		);

		const result = await svc.run({ contactId, email: contactEmail, companyId, userId });

		expect(result.gmail).toEqual({ status: "synced", written: 1 });
		expect(result.calendar).toEqual({ status: "synced", written: 1 });

		const thread = await db.emailThread.findFirst({
			where: { messages: { some: { rfcMessageId: rfcId } } },
			select: { contactId: true },
		});
		expect(thread?.contactId).toBe(contactId);
	});

	it("capstone: relinks a thread the live sync already stored by company only -- the relationship panel query now returns it", async () => {
		const rfcId = `history-relink-${suffix}@mail.test`;
		const rootId = `<history-relink-root-${suffix}@mail.test>`;
		const sentAt = new Date("2026-02-03T10:00:00Z");

		const existingThread = await db.emailThread.create({
			data: {
				rootMessageId: rootId,
				subject: "History",
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
				threadId: existingThread.id,
				rfcMessageId: rfcId,
				syncedByUserId: userId,
				direction: "INBOUND",
				fromEmail: `sender@${senderDomain}`,
				fromName: "Sender",
				recipients: [],
				subject: "History",
				snippet: "Body.",
				body: "Body.",
				sentAt,
			},
		});
		await db.activity.create({
			data: {
				type: "EMAIL",
				subject: "History",
				body: "Body.",
				occurredAt: sentAt,
				companyId,
				contactId: null,
				createdById: userId,
				emailThreadId: existingThread.id,
				meta: { synced: true, source: "gmail" },
			},
		});

		const message = gmailMessage(rfcId, `sender@${senderDomain}`, sentAt);
		const svc = service(
			gmailStub({ searchIds: [message.id as string], messages: { [message.id as string]: message } }),
			tokenStub({ outcome: "ok", accessToken: "gmail-token" }),
			calendarClientStub([]),
		);

		await svc.run({ contactId, email: contactEmail, companyId, userId });

		const linked = await db.emailThread.aggregate({
			where: { contactId },
			_count: { _all: true },
		});
		expect(linked._count._all).toBeGreaterThan(0);
	});

	it("skips Gmail but still attempts Calendar when the Gmail token needs reconnect", async () => {
		const svc = service(
			gmailStub({}),
			tokenStub({ outcome: "needs-reconnect", reason: "expired" }),
			calendarClientStub([
				calendarEvent(`ical-gmailskip-${suffix}`, `organizer@${senderDomain}`, new Date("2026-02-04T10:00:00Z")),
			]),
		);

		const result = await svc.run({ contactId, email: contactEmail, companyId, userId });

		expect(result.gmail.status).toBe("skipped");
		expect(result.calendar).toEqual({ status: "synced", written: 1 });
	});

	it("skips Calendar but still attempts Gmail when the Calendar token needs reconnect", async () => {
		const rfcId = `history-calskip-${suffix}@mail.test`;
		const message = gmailMessage(rfcId, `sender@${senderDomain}`, new Date("2026-02-05T10:00:00Z"));
		const svc = service(
			gmailStub({ searchIds: [message.id as string], messages: { [message.id as string]: message } }),
			tokenStub(
				{ outcome: "ok", accessToken: "gmail-token" },
				{ outcome: "needs-reconnect", reason: "expired" },
			),
			calendarClientStub([]),
		);

		const result = await svc.run({ contactId, email: contactEmail, companyId, userId });

		expect(result.gmail).toEqual({ status: "synced", written: 1 });
		expect(result.calendar.status).toBe("skipped");
	});

	it("skips a source silently when it was never connected (no MailboxSync row)", async () => {
		const bareUserId = `user-${suffix}-bare`;
		await db.user.create({ data: { id: bareUserId, name: "Bare", email: `${bareUserId}@example.test` } });

		const svc = service(gmailStub({}), tokenStub({ outcome: "ok", accessToken: "unused" }), calendarClientStub([]));

		const result = await svc.run({ contactId, email: contactEmail, companyId, userId: bareUserId });

		expect(result.gmail.status).toBe("skipped");
		expect(result.calendar.status).toBe("skipped");
	});

	it("does not duplicate a Gmail message the live sync already fully stored for this contact", async () => {
		const rfcId = `history-dedup-${suffix}@mail.test`;
		const rootId = `<history-dedup-root-${suffix}@mail.test>`;
		const sentAt = new Date("2026-02-06T10:00:00Z");

		const existingThread = await db.emailThread.create({
			data: {
				rootMessageId: rootId,
				subject: "History",
				companyId,
				contactId,
				firstMessageAt: sentAt,
				lastMessageAt: sentAt,
				messageCount: 1,
			},
			select: { id: true },
		});
		await db.emailMessage.create({
			data: {
				threadId: existingThread.id,
				rfcMessageId: rfcId,
				syncedByUserId: userId,
				direction: "INBOUND",
				fromEmail: `sender@${senderDomain}`,
				fromName: "Sender",
				recipients: [],
				subject: "History",
				snippet: "Body.",
				body: "Body.",
				sentAt,
			},
		});
		await db.activity.create({
			data: {
				type: "EMAIL",
				subject: "History",
				body: "Body.",
				occurredAt: sentAt,
				companyId,
				contactId,
				createdById: userId,
				emailThreadId: existingThread.id,
				meta: { synced: true, source: "gmail" },
			},
		});

		const message = gmailMessage(rfcId, `sender@${senderDomain}`, sentAt);
		const svc = service(
			gmailStub({ searchIds: [message.id as string], messages: { [message.id as string]: message } }),
			tokenStub({ outcome: "ok", accessToken: "gmail-token" }),
			calendarClientStub([]),
		);

		const result = await svc.run({ contactId, email: contactEmail, companyId, userId });

		expect(result.gmail).toEqual({ status: "synced", written: 0 });
		expect(
			await db.emailMessage.count({ where: { rfcMessageId: rfcId } }),
		).toBe(1);
	});

	it("respects the Gmail and Calendar result caps", async () => {
		const gmailCaptured: { maxResults?: number } = {};
		const calendarCaptured: { maxResults?: number } = {};
		const svc = service(
			gmailStub({ captured: gmailCaptured }),
			tokenStub({ outcome: "ok", accessToken: "gmail-token" }),
			calendarClientStub([], calendarCaptured),
		);

		await svc.run({ contactId, email: contactEmail, companyId, userId });

		expect(gmailCaptured.maxResults).toBe(BACKFILL_GMAIL_MAX_RESULTS);
		expect(calendarCaptured.maxResults).toBe(BACKFILL_CALENDAR_MAX_RESULTS);
	});

	it("searches roughly the last BACKFILL_WINDOW_MONTHS months", async () => {
		const calendarCaptured: { timeMin?: string } = {};
		const svc = service(
			gmailStub({}),
			tokenStub({ outcome: "ok", accessToken: "gmail-token" }),
			calendarClientStub([], calendarCaptured),
		);

		const before = Date.now();
		await svc.run({ contactId, email: contactEmail, companyId, userId });

		const expectedAfter = new Date(before);
		expectedAfter.setMonth(expectedAfter.getMonth() - BACKFILL_WINDOW_MONTHS);

		const actualAfter = new Date(calendarCaptured.timeMin as string).getTime();
		expect(Math.abs(actualAfter - expectedAfter.getTime())).toBeLessThan(60_000);
	});

	it("stays resilient when the Gmail search throws -- Calendar still completes", async () => {
		const svc = service(
			gmailStub({ searchThrows: true }),
			tokenStub({ outcome: "ok", accessToken: "gmail-token" }),
			calendarClientStub([
				calendarEvent(`ical-resilience-${suffix}`, `organizer@${senderDomain}`, new Date("2026-02-07T10:00:00Z")),
			]),
		);

		const result = await svc.run({ contactId, email: contactEmail, companyId, userId });

		expect(result.gmail.status).toBe("skipped");
		expect(result.calendar).toEqual({ status: "synced", written: 1 });
	});
});
