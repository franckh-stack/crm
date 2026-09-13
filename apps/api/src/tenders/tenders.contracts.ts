import { z } from "zod";

// Bornes calquees sur api_v2/routers/tenders.py::list_tenders -- valider ici
// evite d'expedier une requete que l'API VigieProcure refusera de toute
// facon, et donne une erreur Zod lisible cote CRM plutot qu'un 422 distant.
export const tendersListOuvertsInput = z.object({
	cpv: z.string().trim().min(2).max(400).optional(),
	department: z.string().trim().min(1).max(3).optional(),
	q: z.string().trim().min(2).max(200).optional(),
	page: z.number().int().min(1).max(500).default(1),
	limit: z.number().int().min(1).max(100).default(20),
	cursor: z.string().optional(),
});

export type TendersListOuvertsInput = z.infer<typeof tendersListOuvertsInput>;

const tenderOutput = z.object({
	id: z.string(),
	source: z.string().nullable(),
	sourceId: z.string().nullable(),
	title: z.string().nullable(),
	titleDisplay: z.string().nullable(),
	cpvCode: z.string().nullable(),
	procedureType: z.string().nullable(),
	amountEstimated: z.number().nullable(),
	department: z.string().nullable(),
	publishedAt: z.string().nullable(),
	deadlineAt: z.string().nullable(),
	status: z.string().nullable(),
	buyerId: z.string().nullable(),
	buyerName: z.string().nullable(),
	updatedAt: z.string().nullable(),
});

const tendersPageOutput = z.object({
	items: z.array(tenderOutput),
	count: z.number(),
	total: z.number(),
	totalEstPlafonne: z.boolean(),
	page: z.number(),
	pageSize: z.number(),
	nextCursor: z.string().nullable(),
});

export const tendersListOuvertsOutput = z.discriminatedUnion("outcome", [
	z.object({ outcome: z.literal("not-configured") }),
	z.object({ outcome: z.literal("unauthorized"), reason: z.string() }),
	z.object({ outcome: z.literal("failed"), reason: z.string() }),
	z.object({ outcome: z.literal("ok"), page: tendersPageOutput }),
]);

export type TendersListOuvertsOutput = z.infer<typeof tendersListOuvertsOutput>;
