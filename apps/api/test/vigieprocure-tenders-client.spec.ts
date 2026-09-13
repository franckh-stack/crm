import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { z } from "zod";
import {
	listOpenTenders,
	vigieProcureTendersApi,
} from "../src/tenders/vigieprocure-tenders.client";

const realFetch = globalThis.fetch;

let previousUrl: string | undefined;
let previousJwt: string | undefined;

beforeEach(() => {
	previousUrl = process.env.VIGIEPROCURE_API_URL;
	previousJwt = process.env.VIGIEPROCURE_API_JWT;
	process.env.VIGIEPROCURE_API_URL = "https://api.vigieproc.fr";
	process.env.VIGIEPROCURE_API_JWT = "test-jwt";
});

afterEach(() => {
	globalThis.fetch = realFetch;
	if (previousUrl === undefined) delete process.env.VIGIEPROCURE_API_URL;
	else process.env.VIGIEPROCURE_API_URL = previousUrl;
	if (previousJwt === undefined) delete process.env.VIGIEPROCURE_API_JWT;
	else process.env.VIGIEPROCURE_API_JWT = previousJwt;
});

/** Stub fetch and capture the request URL it was called with. */
function stub(
	status: number,
	body: z.core.util.JSONType,
): { calledWith: () => URL } {
	let captured: URL | null = null;
	globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
		captured = new URL(
			typeof input === "string" || input instanceof URL
				? input
				: (input as Request).url,
		);
		return new Response(JSON.stringify(body), {
			status,
			headers: { "content-type": "application/json" },
		});
	}) as unknown as typeof fetch;
	return {
		calledWith: () => {
			if (!captured) throw new Error("fetch was not called");
			return captured;
		},
	};
}

const emptyPage = {
	items: [],
	count: 0,
	total: 0,
	total_est_plafonne: false,
	page: 1,
	page_size: 20,
	next_cursor: null,
};

describe("vigieProcureTendersApi", () => {
	it("returns null when the JWT is unset -- not an unauthenticated call", () => {
		delete process.env.VIGIEPROCURE_API_JWT;
		expect(vigieProcureTendersApi()).toBeNull();
	});

	it("returns null when the URL is unset", () => {
		delete process.env.VIGIEPROCURE_API_URL;
		expect(vigieProcureTendersApi()).toBeNull();
	});
});

describe("listOpenTenders", () => {
	it("degrades to not-configured when the env is unset -- never crashes", async () => {
		delete process.env.VIGIEPROCURE_API_URL;
		delete process.env.VIGIEPROCURE_API_JWT;
		const result = await listOpenTenders({});
		expect(result).toEqual({ outcome: "not-configured" });
	});

	it("sends no status param when none is given -- 'Tous', not a hidden default to active", async () => {
		const fetchSpy = stub(200, emptyPage);
		await listOpenTenders({});
		expect(fetchSpy.calledWith().searchParams.has("status")).toBe(false);
	});

	it("forwards an explicit status=active ('En cours')", async () => {
		const fetchSpy = stub(200, emptyPage);
		await listOpenTenders({ status: "active" });
		expect(fetchSpy.calledWith().searchParams.get("status")).toBe("active");
	});

	it("forwards status=awarded ('Notifie')", async () => {
		const fetchSpy = stub(200, emptyPage);
		await listOpenTenders({ status: "awarded" });
		expect(fetchSpy.calledWith().searchParams.get("status")).toBe("awarded");
	});

	it("forwards status=previsionnel ('Prevu')", async () => {
		const fetchSpy = stub(200, emptyPage);
		await listOpenTenders({ status: "previsionnel" });
		expect(fetchSpy.calledWith().searchParams.get("status")).toBe(
			"previsionnel",
		);
	});

	it("forwards siren untouched -- truncation to 9 digits is api_v2's job", async () => {
		const fetchSpy = stub(200, emptyPage);
		await listOpenTenders({ siren: "42498265000012" });
		expect(fetchSpy.calledWith().searchParams.get("siren")).toBe(
			"42498265000012",
		);
	});

	it("omits siren when not given", async () => {
		const fetchSpy = stub(200, emptyPage);
		await listOpenTenders({});
		expect(fetchSpy.calledWith().searchParams.has("siren")).toBe(false);
	});

	it("combines siren and status together (account-tab use case)", async () => {
		const fetchSpy = stub(200, emptyPage);
		await listOpenTenders({ siren: "424982650", status: "awarded" });
		const params = fetchSpy.calledWith().searchParams;
		expect(params.get("siren")).toBe("424982650");
		expect(params.get("status")).toBe("awarded");
	});

	it("maps 401 to unauthorized", async () => {
		stub(401, { detail: "Not authenticated" });
		const result = await listOpenTenders({});
		expect(result.outcome).toBe("unauthorized");
	});

	it("maps a 200 body through to outcome ok", async () => {
		stub(200, emptyPage);
		const result = await listOpenTenders({});
		expect(result.outcome).toBe("ok");
		if (result.outcome === "ok") {
			expect(result.page.items).toEqual([]);
			expect(result.page.total).toBe(0);
		}
	});
});
