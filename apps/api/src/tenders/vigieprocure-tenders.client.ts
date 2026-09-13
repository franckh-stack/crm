import { z } from "zod";

const TENDERS_TIMEOUT_MS = 15_000;
const TENDERS_PATH = "/api/v1/tenders";

export interface VigieProcureTendersApi {
	url: URL;
	jwt: string;
}

/**
 * `VIGIEPROCURE_API_JWT` unset means there is no way to call VigieProcure,
 * not an unauthenticated call to it -- same rule as `vigieProcureApi()` in
 * `companies/vigieprocure-companies.client.ts` (resolveSiren/setSiren) and
 * `bridge()`/`vigieProcureBridge()` elsewhere. Every caller has to say what
 * it does without VigieProcure.
 */
export function vigieProcureTendersApi(): VigieProcureTendersApi | null {
	const jwt = process.env.VIGIEPROCURE_API_JWT?.trim();
	const base = process.env.VIGIEPROCURE_API_URL?.trim();
	if (!jwt || !base) return null;

	return { url: new URL(TENDERS_PATH, base), jwt };
}

const tenderItem = z
	.object({
		id: z.string(),
		source: z.string().nullable().catch(null),
		source_id: z.string().nullable().catch(null),
		title: z.string().nullable().catch(null),
		title_display: z.string().nullable().catch(null),
		cpv_code: z.string().nullable().catch(null),
		procedure_type: z.string().nullable().catch(null),
		amount_estimated: z.number().nullable().catch(null),
		department: z.string().nullable().catch(null),
		published_at: z.string().nullable().catch(null),
		deadline_at: z.string().nullable().catch(null),
		status: z.string().nullable().catch(null),
		buyer_id: z.string().nullable().catch(null),
		buyer_name: z.string().nullable().catch(null),
		updated_at: z.string().nullable().catch(null),
	})
	.transform((raw) => ({
		id: raw.id,
		source: raw.source,
		sourceId: raw.source_id,
		title: raw.title,
		// `title_display` retire le prefixe source TED ("France - <CPV> - ")
		// quand il est present ; repli sur `title` sinon (BOAMP, data_gouv,
		// TED sans prefixe). Cf. api_v2/routers/tenders.py::list_tenders.
		titleDisplay: raw.title_display ?? raw.title,
		cpvCode: raw.cpv_code,
		procedureType: raw.procedure_type,
		amountEstimated: raw.amount_estimated,
		department: raw.department,
		publishedAt: raw.published_at,
		deadlineAt: raw.deadline_at,
		status: raw.status,
		buyerId: raw.buyer_id,
		buyerName: raw.buyer_name,
		updatedAt: raw.updated_at,
	}));

export type VigieProcureTender = z.infer<typeof tenderItem>;

const tendersResponse = z.object({
	items: z.array(tenderItem).catch([]),
	count: z.number().catch(0),
	total: z.number().catch(0),
	total_est_plafonne: z.boolean().catch(false),
	page: z.number().catch(1),
	page_size: z.number().catch(0),
	next_cursor: z.string().nullable().catch(null),
});

export type TendersPage = {
	items: VigieProcureTender[];
	count: number;
	total: number;
	totalEstPlafonne: boolean;
	page: number;
	pageSize: number;
	nextCursor: string | null;
};

export type TendersQuery = {
	cpv?: string;
	department?: string;
	siren?: string;
	status?: "active" | "awarded" | "previsionnel";
	q?: string;
	page?: number;
	limit?: number;
	cursor?: string;
};

export type TendersResult =
	| { outcome: "ok"; page: TendersPage }
	| { outcome: "not-configured" }
	| { outcome: "unauthorized"; reason: string }
	| { outcome: "failed"; reason: string };

/**
 * Liste les marches via l'API VigieProcure (`GET /api/v1/tenders`).
 *
 * `status` est un parametre d'entree optionnel cote CRM (mapping metier
 * "En cours"=active / "Notifie"=awarded / "Prevu"=previsionnel, defini dans
 * `tenders.contracts.ts`). Un appel SANS `status` transmet la requete telle
 * quelle a api_v2, qui repond alors sans filtre de statut ("Tous") --
 * c'est le comportement voulu par l'onglet "Marches publics" de la fiche
 * compte, PAS un defaut a "active" impose ici (cf. api_v2/routers/tenders.py
 * ::_STATUTS ; `status=active` doit desormais etre demande explicitement
 * par l'appelant s'il veut "En cours").
 *
 * Pas de champ "lien vers l'avis d'origine" ici : `external_url` n'existe
 * QUE sur `GET /tenders/{id}` (extrait de `raw_data->>'url_avis'`), pas sur
 * ce feed de liste. On ne l'invente pas.
 */
export async function listOpenTenders(
	query: TendersQuery,
): Promise<TendersResult> {
	const api = vigieProcureTendersApi();
	if (!api) return { outcome: "not-configured" };

	const target = new URL(api.url);
	// Omission volontaire des parametres vides : `q`/`cpv` exigent
	// min_length>=2 et `department` min_length>=1 cote api_v2 -- envoyer une
	// chaine vide donnerait un 422 sur CHAQUE chargement de page non filtre.
	if (query.cpv) target.searchParams.set("cpv", query.cpv);
	if (query.department) target.searchParams.set("department", query.department);
	// api_v2 tronque au SIREN (9 premiers caracteres) quand un SIRET (14) est
	// fourni -- cf. api_v2/routers/tenders.py::list_tenders. On envoie la
	// valeur telle quelle, c'est la responsabilite d'api_v2, pas la notre.
	if (query.siren) target.searchParams.set("siren", query.siren);
	if (query.status) target.searchParams.set("status", query.status);
	if (query.q) target.searchParams.set("q", query.q);
	if (query.cursor) {
		target.searchParams.set("cursor", query.cursor);
	} else if (query.page) {
		target.searchParams.set("page", String(query.page));
	}
	target.searchParams.set("limit", String(query.limit ?? 20));

	try {
		const response = await fetch(target, {
			headers: { authorization: `Bearer ${api.jwt}` },
			signal: AbortSignal.timeout(TENDERS_TIMEOUT_MS),
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

		const parsed = tendersResponse.safeParse(await response.json());
		if (!parsed.success) {
			return {
				outcome: "failed",
				reason: "VigieProcure's response did not match the expected shape.",
			};
		}

		return {
			outcome: "ok",
			page: {
				items: parsed.data.items,
				count: parsed.data.count,
				total: parsed.data.total,
				totalEstPlafonne: parsed.data.total_est_plafonne,
				page: parsed.data.page,
				pageSize: parsed.data.page_size,
				nextCursor: parsed.data.next_cursor,
			},
		};
	} catch (cause) {
		const aborted = cause instanceof Error && cause.name === "AbortError";
		return {
			outcome: "failed",
			reason: aborted
				? `Timed out after ${TENDERS_TIMEOUT_MS}ms.`
				: cause instanceof Error
					? cause.message
					: String(cause),
		};
	}
}
