import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { z } from "zod";
import {
	resolveSiren,
	vigieProcureApi,
} from "../src/companies/vigieprocure-companies.client";

const realFetch = globalThis.fetch;

let previousUrl: string | undefined;
let previousJwt: string | undefined;

beforeEach(() => {
	previousUrl = process.env.VIGIEPROCURE_API_URL;
	previousJwt = process.env.VIGIEPROCURE_API_JWT;
	delete process.env.VIGIEPROCURE_API_URL;
	delete process.env.VIGIEPROCURE_API_JWT;
});

afterEach(() => {
	globalThis.fetch = realFetch;
	if (previousUrl === undefined) delete process.env.VIGIEPROCURE_API_URL;
	else process.env.VIGIEPROCURE_API_URL = previousUrl;
	if (previousJwt === undefined) delete process.env.VIGIEPROCURE_API_JWT;
	else process.env.VIGIEPROCURE_API_JWT = previousJwt;
});

function stub(status: number, body: z.core.util.JSONType): void {
	globalThis.fetch = (async () =>
		new Response(JSON.stringify(body), {
			status,
			headers: { "content-type": "application/json" },
		})) as unknown as typeof fetch;
}

describe("vigieProcureApi", () => {
	it("returns null when the JWT is unset -- not an unauthenticated call", () => {
		process.env.VIGIEPROCURE_API_URL = "https://api.vigieproc.fr";
		expect(vigieProcureApi()).toBeNull();
	});

	it("returns null when the URL is unset", () => {
		process.env.VIGIEPROCURE_API_JWT = "test-jwt";
		expect(vigieProcureApi()).toBeNull();
	});

	it("returns a config when both are set", () => {
		process.env.VIGIEPROCURE_API_URL = "https://api.vigieproc.fr";
		process.env.VIGIEPROCURE_API_JWT = "test-jwt";

		const result = vigieProcureApi();
		expect(result).not.toBeNull();
		expect(result?.jwt).toBe("test-jwt");
		expect(result?.url.toString()).toBe(
			"https://api.vigieproc.fr/api/v1/companies/resolve",
		);
	});
});

describe("resolveSiren", () => {
	it("degrades to not-configured when the env is unset -- never crashes", async () => {
		const result = await resolveSiren({ name: "Acme" });
		expect(result).toEqual({ outcome: "not-configured" });
	});

	it("maps a single exact candidate through", async () => {
		process.env.VIGIEPROCURE_API_URL = "https://api.vigieproc.fr";
		process.env.VIGIEPROCURE_API_JWT = "test-jwt";
		stub(200, {
			items: [
				{
					siren: "424982650",
					siret: "42498265000012",
					name_canonical_full: "SCC FRANCE",
					legal_form_label: "SAS",
					naf_code: "4651Z",
					naf_label: "Commerce de gros",
					city: "Suresnes",
					department: "92",
					confidence: "exact",
					matched_on: "name",
				},
			],
			count: 1,
			total_matches: 1,
			query: { name: "SCC FRANCE" },
			provenance: {},
		});

		const result = await resolveSiren({ name: "SCC FRANCE" });
		expect(result.outcome).toBe("ok");
		if (result.outcome === "ok") {
			expect(result.candidates).toHaveLength(1);
			expect(result.candidates[0]?.siren).toBe("424982650");
			expect(result.candidates[0]?.confidence).toBe("exact");
		}
	});

	it("maps 401 to unauthorized", async () => {
		process.env.VIGIEPROCURE_API_URL = "https://api.vigieproc.fr";
		process.env.VIGIEPROCURE_API_JWT = "test-jwt";
		stub(401, { detail: "Not authenticated" });

		const result = await resolveSiren({ name: "Acme" });
		expect(result.outcome).toBe("unauthorized");
	});

	it("treats a malformed body as failed, not a crash", async () => {
		process.env.VIGIEPROCURE_API_URL = "https://api.vigieproc.fr";
		process.env.VIGIEPROCURE_API_JWT = "test-jwt";
		stub(200, { unexpected: "shape" });

		const result = await resolveSiren({ name: "Acme" });
		expect(result.outcome).toBe("ok");
		if (result.outcome === "ok") {
			expect(result.candidates).toEqual([]);
		}
	});
});
