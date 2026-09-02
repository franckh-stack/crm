import { afterEach, describe, expect, it } from "bun:test";
import { GmailClient, WORK_MAIL_QUERY } from "../src/google/gmail.client";
import { MailboxApiClient } from "../src/mailbox/mailbox-api.client";

const realFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = realFetch;
});

function stubCapturingUrl(): { calls: URL[] } {
	const calls: URL[] = [];
	globalThis.fetch = (async (input: string | URL | Request) => {
		calls.push(new URL(input.toString()));
		return new Response(JSON.stringify({ messages: [] }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as unknown as typeof fetch;
	return { calls };
}

const client = new GmailClient(new MailboxApiClient());

describe("GmailClient.listMessages", () => {
	it("sends the same q string as before when no extra query is given", async () => {
		const { calls } = stubCapturingUrl();
		await client.listMessages("token", {
			after: new Date("2026-01-01T00:00:00Z"),
			before: new Date("2026-02-01T00:00:00Z"),
		});

		const q = calls[0]?.searchParams.get("q");
		expect(q).toBe(
			`${WORK_MAIL_QUERY} after:1767225600 before:1769904000`,
		);
	});
});

describe("GmailClient.searchByParticipant", () => {
	it("builds a q combining the work-mail filter, the date window, and the participant clause", async () => {
		const { calls } = stubCapturingUrl();
		await client.searchByParticipant("token", {
			email: "dvignault@scalair.fr",
			after: new Date("2026-01-01T00:00:00Z"),
			before: new Date("2026-02-01T00:00:00Z"),
		});

		const q = calls[0]?.searchParams.get("q");
		expect(q).toBe(
			`${WORK_MAIL_QUERY} after:1767225600 before:1769904000 (from:dvignault@scalair.fr OR to:dvignault@scalair.fr)`,
		);
	});

	it("forwards maxResults", async () => {
		const { calls } = stubCapturingUrl();
		await client.searchByParticipant("token", {
			email: "dvignault@scalair.fr",
			after: new Date("2026-01-01T00:00:00Z"),
			before: new Date("2026-02-01T00:00:00Z"),
			maxResults: 42,
		});

		expect(calls[0]?.searchParams.get("maxResults")).toBe("42");
	});
});
