import { z } from "zod";

const RESOLVE_TIMEOUT_MS = 15_000;
const RESOLVE_PATH = "/api/v1/companies/resolve";

export interface VigieProcureApi {
	url: URL;
	jwt: string;
}

/**
 * `VIGIEPROCURE_API_JWT` unset means there is no way to call VigieProcure,
 * not an unauthenticated call to it -- same rule as `bridge()` (agent) and
 * `vigieProcureBridge()` (webhook). Every caller has to say what it does
 * without VigieProcure.
 */
export function vigieProcureApi(): VigieProcureApi | null {
	const jwt = process.env.VIGIEPROCURE_API_JWT?.trim();
	const base = process.env.VIGIEPROCURE_API_URL?.trim();
	if (!jwt || !base) return null;

	return { url: new URL(RESOLVE_PATH, base), jwt };
}

const resolveConfidence = z.enum(["exact", "ambiguous", "weak"]);

const resolveItem = z
	.object({
		siren: z.string(),
		siret: z.string().nullable().catch(null),
		name_canonical_full: z.string(),
		legal_form_label: z.string().nullable().catch(null),
		naf_code: z.string().nullable().catch(null),
		naf_label: z.string().nullable().catch(null),
		city: z.string().nullable().catch(null),
		department: z.string().nullable().catch(null),
		confidence: resolveConfidence,
		matched_on: z.string().nullable().catch(null),
	})
	.transform((raw) => ({
		siren: raw.siren,
		siret: raw.siret,
		nameCanonicalFull: raw.name_canonical_full,
		legalFormLabel: raw.legal_form_label,
		nafCode: raw.naf_code,
		nafLabel: raw.naf_label,
		city: raw.city,
		department: raw.department,
		confidence: raw.confidence,
		matchedOn: raw.matched_on,
	}));

const resolveResponse = z.object({
	items: z.array(resolveItem).catch([]),
	count: z.number().catch(0),
	total_matches: z.number().catch(0),
});

export type SirenCandidate = z.infer<typeof resolveItem>;

export type SirenResolution =
	| { outcome: "ok"; candidates: SirenCandidate[] }
	| { outcome: "not-configured" }
	| { outcome: "unauthorized"; reason: string }
	| { outcome: "failed"; reason: string };

/**
 * Resout un nom de company CRM en SIREN candidat(s) via l'API VigieProcure
 * (`GET /api/v1/companies/resolve`). Jamais de SIREN unique implicite --
 * l'appelant tranche sur `candidates`, y compris quand `confidence` vaut
 * "exact" pour un seul element.
 */
export async function resolveSiren(query: {
	name: string;
	city?: string | null;
	domain?: string | null;
}): Promise<SirenResolution> {
	const api = vigieProcureApi();
	if (!api) return { outcome: "not-configured" };

	const target = new URL(api.url);
	target.searchParams.set("name", query.name);
	if (query.city) target.searchParams.set("city", query.city);
	if (query.domain) target.searchParams.set("domain", query.domain);

	try {
		const response = await fetch(target, {
			headers: { authorization: `Bearer ${api.jwt}` },
			signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
		});

		if (response.status === 401 || response.status === 403) {
			return {
				outcome: "unauthorized",
				reason: `VigieProcure answered ${response.status} -- the service JWT may be missing or expired.`,
			};
		}

		if (!response.ok) {
			return {
				outcome: "failed",
				reason: `VigieProcure answered ${response.status}.`,
			};
		}

		const parsed = resolveResponse.safeParse(await response.json());
		if (!parsed.success) {
			return {
				outcome: "failed",
				reason: "VigieProcure's response did not match the expected shape.",
			};
		}

		return { outcome: "ok", candidates: parsed.data.items };
	} catch (cause) {
		const aborted = cause instanceof Error && cause.name === "AbortError";
		return {
			outcome: "failed",
			reason: aborted
				? `Timed out after ${RESOLVE_TIMEOUT_MS}ms.`
				: cause instanceof Error
					? cause.message
					: String(cause),
		};
	}
}
