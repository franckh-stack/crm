import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db, type MailboxSyncModel as MailboxSync } from "@crm/db";
import type { AgentTriggerService } from "../src/agent/agent-trigger.service";
import { CompanyDirectoryService } from "../src/companies/company-directory.service";
import { ActivityStampService } from "../src/crm/activity-stamp.service";
import { EnrichmentLogService } from "../src/crm/enrichment-log.service";
import type {
	CalendarClient,
	GoogleEvent,
} from "../src/google/calendar.client";
import { CalendarSyncService } from "../src/google/calendar-sync.service";
import { MailboxMatchService } from "../src/mailbox/mailbox-match.service";
import type {
	MailboxTokenService,
	TokenResult,
} from "../src/mailbox/mailbox-token.service";
import { SyncStateService } from "../src/mailbox/sync-state.service";
import { withDiscardedCrmEvents } from "./agent-trigger.stub";

const suffix = process.env.TEST_RUN_ID ?? "calendar-sync-apply-spec";
const knownDomain = `calsync-known-${suffix}.test`;
const unmatchedDomain = `calsync-unmatched-${suffix}.test`;
const userId = `user-${suffix}`;

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

function tokenStub(result: TokenResult): MailboxTokenService {
	return {
		accessTokenFor: async () => result,
	} as unknown as MailboxTokenService;
}

function calendarStub(items: GoogleEvent[]): CalendarClient {
	return {
		searchByParticipant: async () => ({ outcome: "ok", data: { items } }),
	} as unknown as CalendarClient;
}

let row: MailboxSync;
let knownCompanyId: string;

function event(
	iCalUid: string,
	organizerEmail: string,
	startsAt: Date,
): GoogleEvent {
	return {
		id: `gcal-${iCalUid}`,
		iCalUID: iCalUid,
		status: "confirmed",
		summary: "Sync",
		organizer: { email: organizerEmail },
		attendees: [{ email: organizerEmail }],
		start: { dateTime: startsAt.toISOString() },
		end: { dateTime: new Date(startsAt.getTime() + 3600_000).toISOString() },
	};
}

async function clean() {
	await db.calendarEvent.deleteMany({
		where: { syncedByUserId: userId },
	});
	await db.contact.deleteMany({
		where: { email: { endsWith: `@${knownDomain}` } },
	});
	await db.company.deleteMany({
		where: { domain: { in: [knownDomain, unmatchedDomain] } },
	});
	await db.mailboxSync.deleteMany({ where: { userId } });
	await db.user.deleteMany({ where: { id: userId } });
}

beforeAll(async () => {
	await clean();
	await db.user.create({
		data: { id: userId, name: "Test Rep", email: `rep-${suffix}@example.test` },
	});
	row = await db.mailboxSync.create({
		data: { userId, source: "calendar", autoCreate: false },
	});
	const company = await db.company.create({
		data: { name: "Known Co", domain: knownDomain },
		select: { id: true },
	});
	knownCompanyId = company.id;
});

afterAll(clean);

describe("CalendarSyncService.apply() with preresolved", () => {
	it("writes using preresolved ids, without calling match.resolve", async () => {
		const service = new CalendarSyncService(
			db,
			{} as unknown as CalendarClient,
			tokenStub({ outcome: "ok", accessToken: "unused" }),
			match,
			state,
			stamp,
			agent,
		);
		const context = await service.buildContext();

		const contact = await db.contact.create({
			data: {
				firstName: "Relink",
				lastName: "Target",
				email: `relink@${knownDomain}`,
				companyId: knownCompanyId,
			},
			select: { id: true },
		});

		const result = await service.apply(
			event(
				`ical-preresolved-${suffix}-a`,
				`nobody@${unmatchedDomain}`,
				new Date("2026-01-10T10:00:00Z"),
			),
			row,
			context,
			{ companyId: knownCompanyId, contactId: contact.id },
		);

		expect(result).toBe("written");

		const stored = await db.calendarEvent.findUnique({
			where: {
				iCalUid_originalStartTime: {
					iCalUid: `ical-preresolved-${suffix}-a`,
					originalStartTime: new Date("2026-01-10T10:00:00Z"),
				},
			},
			select: { companyId: true, contactId: true },
		});
		expect(stored?.companyId).toBe(knownCompanyId);
		expect(stored?.contactId).toBe(contact.id);
	});

	it("regression: apply() without preresolved is unchanged (unmatched participant, autoCreate off -> ignored)", async () => {
		const service = new CalendarSyncService(
			db,
			{} as unknown as CalendarClient,
			tokenStub({ outcome: "ok", accessToken: "unused" }),
			match,
			state,
			stamp,
			agent,
		);
		const context = await service.buildContext();

		const result = await service.apply(
			event(
				`ical-preresolved-${suffix}-b`,
				`nobody@${unmatchedDomain}`,
				new Date("2026-01-11T10:00:00Z"),
			),
			row,
			context,
		);

		expect(result).toBe("ignored");
	});

	it("dedup: a second apply() with preresolved wins on the update branch over a first match.resolve-driven write", async () => {
		const service = new CalendarSyncService(
			db,
			{} as unknown as CalendarClient,
			tokenStub({ outcome: "ok", accessToken: "unused" }),
			match,
			state,
			stamp,
			agent,
		);
		const context = await service.buildContext();
		const iCalUid = `ical-preresolved-${suffix}-c`;
		const startsAt = new Date("2026-01-12T10:00:00Z");

		// First: default match.resolve() path, matches by domain only
		// (company-only, no contact registered for this exact address).
		const first = await service.apply(
			event(iCalUid, `someone@${knownDomain}`, startsAt),
			row,
			context,
		);
		expect(first).toBe("written");

		const afterFirst = await db.calendarEvent.findUnique({
			where: {
				iCalUid_originalStartTime: { iCalUid, originalStartTime: startsAt },
			},
			select: { id: true, companyId: true, contactId: true },
		});
		expect(afterFirst?.companyId).toBe(knownCompanyId);
		expect(afterFirst?.contactId).toBeNull();

		const contact = await db.contact.create({
			data: {
				firstName: "Dedup",
				lastName: "Winner",
				email: `dedup-${suffix}@${knownDomain}`,
				companyId: knownCompanyId,
			},
			select: { id: true },
		});

		// Second: same iCalUid/originalStartTime, preresolved this time --
		// must upsert to the SAME row, preresolved ids win.
		const second = await service.apply(
			event(iCalUid, `someone@${knownDomain}`, startsAt),
			row,
			context,
			{ companyId: knownCompanyId, contactId: contact.id },
		);
		expect(second).toBe("written");

		const rows = await db.calendarEvent.findMany({
			where: { iCalUid },
			select: { id: true, contactId: true },
		});
		expect(rows).toHaveLength(1);
		expect(rows[0]?.id).toBe(afterFirst?.id);
		expect(rows[0]?.contactId).toBe(contact.id);
	});
});

describe("CalendarSyncService.backfillForParticipant()", () => {
	it("writes matched events found by search, using preresolved ids", async () => {
		const iCalUid = `ical-backfill-${suffix}-a`;
		const startsAt = new Date("2026-01-15T10:00:00Z");
		const service = new CalendarSyncService(
			db,
			calendarStub([event(iCalUid, `someone@${unmatchedDomain}`, startsAt)]),
			tokenStub({ outcome: "ok", accessToken: "token" }),
			match,
			state,
			stamp,
			agent,
		);

		const contact = await db.contact.create({
			data: {
				firstName: "Backfill",
				lastName: "Target",
				email: `backfill@${knownDomain}`,
				companyId: knownCompanyId,
			},
			select: { id: true },
		});

		const result = await service.backfillForParticipant({
			userId,
			email: `someone@${unmatchedDomain}`,
			companyId: knownCompanyId,
			contactId: contact.id,
			after: new Date("2024-01-01T00:00:00Z"),
			before: new Date("2026-12-31T00:00:00Z"),
			maxResults: 100,
		});

		expect(result).toEqual({ status: "synced", written: 1 });

		const stored = await db.calendarEvent.findUnique({
			where: {
				iCalUid_originalStartTime: { iCalUid, originalStartTime: startsAt },
			},
			select: { contactId: true },
		});
		expect(stored?.contactId).toBe(contact.id);
	});

	it("skips when the calendar token needs reconnect", async () => {
		const service = new CalendarSyncService(
			db,
			calendarStub([]),
			tokenStub({ outcome: "needs-reconnect", reason: "expired" }),
			match,
			state,
			stamp,
			agent,
		);

		const result = await service.backfillForParticipant({
			userId,
			email: `x@${unmatchedDomain}`,
			companyId: null,
			contactId: "irrelevant",
			after: new Date("2024-01-01T00:00:00Z"),
			before: new Date("2026-12-31T00:00:00Z"),
			maxResults: 100,
		});

		expect(result.status).toBe("skipped");
	});

	it("skips when the user has no MailboxSync row for calendar", async () => {
		const neverConnectedUserId = `never-connected-${suffix}`;
		const service = new CalendarSyncService(
			db,
			calendarStub([]),
			tokenStub({ outcome: "ok", accessToken: "token" }),
			match,
			state,
			stamp,
			agent,
		);

		const result = await service.backfillForParticipant({
			userId: neverConnectedUserId,
			email: `x@${unmatchedDomain}`,
			companyId: null,
			contactId: "irrelevant",
			after: new Date("2024-01-01T00:00:00Z"),
			before: new Date("2026-12-31T00:00:00Z"),
			maxResults: 100,
		});

		expect(result.status).toBe("skipped");
	});
});
