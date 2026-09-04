import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "@crm/db";
import { AgentQueueService } from "../src/agent/agent-queue.service";
import type { AgentTriggerService } from "../src/agent/agent-trigger.service";
import { CompanyDirectoryService } from "../src/companies/company-directory.service";
import type { ContactHistoryBackfillService } from "../src/contacts/contact-history-backfill.service";
import { ContactsService } from "../src/contacts/contacts.service";
import { ActivityStampService } from "../src/crm/activity-stamp.service";
import { FieldsService } from "../src/fields/fields.service";
import { withDiscardedCrmEvents } from "./agent-trigger.stub";

const suffix = process.env.TEST_RUN_ID ?? "contacts-create-backfill-spec";
const domain = `create-backfill-${suffix}.test`;

const agent = {
	contactCreated: async () => true,
	companyCreated: async () => undefined,
	companyRequested: async () => true,
	withCrmEvents: withDiscardedCrmEvents,
} as unknown as AgentTriggerService;

const stamp = new ActivityStampService(db);
const queue = new AgentQueueService(db);
const directory = new CompanyDirectoryService(agent);
const fields = new FieldsService(db, agent);

type RunCall = {
	contactId: string;
	email: string;
	companyId: string | null;
	userId: string;
};

function historyStub(options: {
	calls: RunCall[];
	rejects?: boolean;
}): ContactHistoryBackfillService {
	return {
		run: async (input: RunCall) => {
			options.calls.push(input);
			if (options.rejects) throw new Error("history backfill exploded");
			return {
				gmail: { status: "skipped", written: 0 },
				calendar: { status: "skipped", written: 0 },
			};
		},
	} as unknown as ContactHistoryBackfillService;
}

async function clean() {
	await db.contact.deleteMany({ where: { email: { endsWith: `@${domain}` } } });
}

beforeAll(clean);
afterAll(clean);

describe("ContactsService.create() triggers the history backfill", () => {
	it("calls history.run with the right fields when actorId is given and the contact has an email", async () => {
		const calls: RunCall[] = [];
		const contacts = new ContactsService(
			db,
			directory,
			agent,
			queue,
			stamp,
			fields,
			historyStub({ calls }),
		);

		const created = await contacts.create(
			{ firstName: "Actor", email: `with-actor@${domain}` },
			`actor-${suffix}`,
		);
		// companyForEmail() may auto-create a company from the domain --
		// not the point of this test, so read back whatever it actually set.
		const stored = await db.contact.findUniqueOrThrow({
			where: { id: created.id },
			select: { companyId: true },
		});

		expect(calls).toHaveLength(1);
		expect(calls[0]).toEqual({
			contactId: created.id,
			email: `with-actor@${domain}`,
			companyId: stored.companyId,
			userId: `actor-${suffix}`,
		});
	});

	it("does not call history.run when actorId is omitted", async () => {
		const calls: RunCall[] = [];
		const contacts = new ContactsService(
			db,
			directory,
			agent,
			queue,
			stamp,
			fields,
			historyStub({ calls }),
		);

		await contacts.create({
			firstName: "NoActor",
			email: `no-actor@${domain}`,
		});

		expect(calls).toHaveLength(0);
	});

	it("does not call history.run when the contact has no email", async () => {
		const calls: RunCall[] = [];
		const contacts = new ContactsService(
			db,
			directory,
			agent,
			queue,
			stamp,
			fields,
			historyStub({ calls }),
		);

		await contacts.create({ firstName: "NoEmail" }, `actor-${suffix}`);

		expect(calls).toHaveLength(0);
	});

	it("catches and does not surface a history.run rejection", async () => {
		const calls: RunCall[] = [];
		const contacts = new ContactsService(
			db,
			directory,
			agent,
			queue,
			stamp,
			fields,
			historyStub({ calls, rejects: true }),
		);

		const result = await contacts.create(
			{ firstName: "Resilient", email: `resilient@${domain}` },
			`actor-${suffix}`,
		);

		expect(result.firstName).toBe("Resilient");
		expect(calls).toHaveLength(1);
	});
});
