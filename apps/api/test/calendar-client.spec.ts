import { afterEach, describe, expect, it } from "bun:test";
import { CalendarClient } from "../src/google/calendar.client";
import { MailboxApiClient } from "../src/mailbox/mailbox-api.client";

const realFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = realFetch;
});

function stubCapturingUrl() {
	const calls: URL[] = [];
	globalThis.fetch = (async (input: string | URL | Request) => {
		calls.push(new URL(input.toString()));
		return new Response(JSON.stringify({ items: [] }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as unknown as typeof fetch;
	return { calls };
}

const client = new CalendarClient(new MailboxApiClient());

describe("CalendarClient.listEvents", () => {
	it("omits q from the request when none is given", async () => {
		const { calls } = stubCapturingUrl();
		await client.listEvents("token", {
			timeMin: "2026-01-01T00:00:00Z",
			timeMax: "2026-02-01T00:00:00Z",
		});

		expect(calls[0]?.searchParams.has("q")).toBe(false);
	});

	it("forwards q when given", async () => {
		const { calls } = stubCapturingUrl();
		await client.listEvents("token", {
			timeMin: "2026-01-01T00:00:00Z",
			timeMax: "2026-02-01T00:00:00Z",
			q: "dvignault@scalair.fr",
		});

		expect(calls[0]?.searchParams.get("q")).toBe("dvignault@scalair.fr");
	});
});

describe("CalendarClient.searchByParticipant", () => {
	it("sends the participant email as q, and the window as timeMin/timeMax", async () => {
		const { calls } = stubCapturingUrl();
		await client.searchByParticipant("token", {
			email: "dvignault@scalair.fr",
			timeMin: new Date("2026-01-01T00:00:00Z"),
			timeMax: new Date("2026-02-01T00:00:00Z"),
		});

		expect(calls[0]?.searchParams.get("q")).toBe("dvignault@scalair.fr");
		expect(calls[0]?.searchParams.get("timeMin")).toBe(
			"2026-01-01T00:00:00.000Z",
		);
		expect(calls[0]?.searchParams.get("timeMax")).toBe(
			"2026-02-01T00:00:00.000Z",
		);
	});

	it("forwards maxResults", async () => {
		const { calls } = stubCapturingUrl();
		await client.searchByParticipant("token", {
			email: "dvignault@scalair.fr",
			timeMin: new Date("2026-01-01T00:00:00Z"),
			timeMax: new Date("2026-02-01T00:00:00Z"),
			maxResults: 42,
		});

		expect(calls[0]?.searchParams.get("maxResults")).toBe("42");
	});
});
