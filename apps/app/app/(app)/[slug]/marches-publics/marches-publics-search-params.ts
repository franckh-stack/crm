import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";

// Parametres propres a cette page -- PAS `createListSearchParams`
// (`@/components/data-table/list-search-params`), qui suppose une liste
// Prisma avec offset/facettes/tri par colonne. Le feed VigieProcure est un
// proxy en lecture vers une API externe avec sa propre pagination
// (page/limit, pas de facettes) : reutiliser cette machinerie aurait force
// un desaccord de forme plutot qu'un raccourci.
export const marchesPublicsParsers = {
	q: parseAsString.withDefault(""),
	cpv: parseAsString.withDefault(""),
	department: parseAsString.withDefault(""),
	page: parseAsInteger.withDefault(1).withOptions({ history: "push" }),
};

type MarchesPublicsValues = {
	q: string;
	cpv: string;
	department: string;
	page: number;
};

const DEFAULTS: MarchesPublicsValues = {
	q: "",
	cpv: "",
	department: "",
	page: 1,
};

function toInput(values: MarchesPublicsValues) {
	return {
		q: values.q.trim() || undefined,
		cpv: values.cpv.trim() || undefined,
		department: values.department.trim() || undefined,
		page: values.page > 0 ? values.page : 1,
		limit: 20,
	};
}

export const marchesPublicsSearchParams = {
	load: createLoader(marchesPublicsParsers),
	toInput,
	defaultInput: () => toInput(DEFAULTS),
};
