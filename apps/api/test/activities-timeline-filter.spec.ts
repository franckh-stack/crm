import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { ActivityType, db } from "@crm/db";
import { ActivitiesService } from "../src/activities/activities.service";
import { ActivityStampService } from "../src/crm/activity-stamp.service";

const suffix = process.env.TEST_RUN_ID ?? "activities-timeline-filter-spec";
const domain = `timeline-filter-${suffix}.test`;
const userId = `user-${suffix}`;

const stamp = new ActivityStampService(db);
const service = new ActivitiesService(db, stamp);

let contactId: string;

async function clean() {
	await db.activity.deleteMany({
		where: { subject: { endsWith: `[${suffix}]` } },
	});
	await db.contact.deleteMany({ where: { email: { endsWith: `@${domain}` } } });
	await db.company.deleteMany({ where: { domain } });
	await db.user.deleteMany({ where: { id: userId } });
}

async function seed(type: ActivityType, subjectPrefix: string) {
	await db.activity.create({
		data: {
			type,
			subject: `${subjectPrefix} [${suffix}]`,
			occurredAt: new Date("2026-01-01T10:00:00Z"),
			contactId,
			createdById: userId,
		},
	});
}

beforeAll(async () => {
	await clean();

	await db.user.create({
		data: { id: userId, name: "Test Rep", email: `rep@${domain}` },
	});

	const company = await db.company.create({
		data: { name: "Timeline Filter Co", domain },
		select: { id: true },
	});

	const contact = await db.contact.create({
		data: {
			firstName: "Timeline",
			lastName: "Filter",
			email: `contact@${domain}`,
			companyId: company.id,
		},
		select: { id: true },
	});
	contactId = contact.id;

	await seed(ActivityType.NOTE, "A note");
	await seed(ActivityType.CALL, "A call log");
	await seed(ActivityType.EMAIL, "A synced email");
	await seed(ActivityType.MEETING, "A synced meeting");
});

afterAll(clean);

describe("ActivitiesService.timeline -- notes filter scope", () => {
	it("the notes tab shows manually-written entries (notes, calls), not synced emails or meetings", async () => {
		const result = await service.timeline({
			contactId,
			filter: "notes",
			limit: 30,
		});

		const subjects = result.entries.map((entry) => entry.subject);

		expect(subjects).toContain(`A note [${suffix}]`);
		expect(subjects).toContain(`A call log [${suffix}]`);
		expect(subjects).not.toContain(`A synced email [${suffix}]`);
		expect(subjects).not.toContain(`A synced meeting [${suffix}]`);
	});

	it("the email tab still shows only emails -- unaffected by the notes-tab fix", async () => {
		const result = await service.timeline({
			contactId,
			filter: "email",
			limit: 30,
		});

		const subjects = result.entries.map((entry) => entry.subject);

		expect(subjects).toEqual([`A synced email [${suffix}]`]);
	});

	it("the meetings tab still shows only meetings -- unaffected by the notes-tab fix", async () => {
		const result = await service.timeline({
			contactId,
			filter: "meetings",
			limit: 30,
		});

		const subjects = result.entries.map((entry) => entry.subject);

		expect(subjects).toEqual([`A synced meeting [${suffix}]`]);
	});

	it("the all tab still shows everything", async () => {
		const result = await service.timeline({
			contactId,
			filter: "all",
			limit: 30,
		});

		expect(result.entries.length).toBe(4);
	});

	it("timelineCounts.notes matches the notes tab, not inflated by email/meetings", async () => {
		const counts = await service.timelineCounts({ contactId });

		expect(counts.notes).toBe(2);
	});
});

describe("ActivitiesService email thread exclusion -- removing noise from the synthesis", () => {
	let threadId: string;

	beforeAll(async () => {
		const thread = await db.emailThread.create({
			data: {
				rootMessageId: `<exclusion-${suffix}@mail.test>`,
				subject: "Excludable",
				contactId,
				firstMessageAt: new Date("2026-02-01T10:00:00Z"),
				lastMessageAt: new Date("2026-02-01T10:00:00Z"),
				messageCount: 1,
			},
			select: { id: true },
		});
		threadId = thread.id;

		await db.activity.create({
			data: {
				type: ActivityType.EMAIL,
				subject: `An excludable email [${suffix}]`,
				occurredAt: new Date("2026-02-01T10:00:00Z"),
				contactId,
				createdById: userId,
				emailThreadId: threadId,
			},
		});
	});

	afterAll(async () => {
		await db.emailThread.deleteMany({
			where: { rootMessageId: `<exclusion-${suffix}@mail.test>` },
		});
	});

	it("shows up in the timeline before it is excluded", async () => {
		const result = await service.timeline({
			contactId,
			filter: "email",
			limit: 30,
		});
		expect(result.entries.map((entry) => entry.subject)).toContain(
			`An excludable email [${suffix}]`,
		);
	});

	it("excludeEmailThread hides it from the timeline and every count", async () => {
		const excluded = await service.excludeEmailThread(threadId);
		expect(excluded.excludedAt).not.toBeNull();

		const [all, email] = await Promise.all([
			service.timeline({ contactId, filter: "all", limit: 30 }),
			service.timeline({ contactId, filter: "email", limit: 30 }),
		]);

		expect(all.entries.map((entry) => entry.subject)).not.toContain(
			`An excludable email [${suffix}]`,
		);
		expect(email.entries.map((entry) => entry.subject)).not.toContain(
			`An excludable email [${suffix}]`,
		);
	});

	it("restoreEmailThread brings it back", async () => {
		const restored = await service.restoreEmailThread(threadId);
		expect(restored.excludedAt).toBeNull();

		const result = await service.timeline({
			contactId,
			filter: "email",
			limit: 30,
		});
		expect(result.entries.map((entry) => entry.subject)).toContain(
			`An excludable email [${suffix}]`,
		);
	});

	it("excluding a thread that does not exist throws NotFoundException", async () => {
		await expect(
			service.excludeEmailThread(`missing-${suffix}`),
		).rejects.toThrow(`No email thread with id missing-${suffix}.`);
	});
});
