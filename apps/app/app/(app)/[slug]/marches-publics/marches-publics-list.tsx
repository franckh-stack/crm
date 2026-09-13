"use client";

import ChevronLeft from "@carbon/icons-react/es/ChevronLeft";
import ChevronRight from "@carbon/icons-react/es/ChevronRight";
import Search from "@carbon/icons-react/es/Search";
import WarningAlt from "@carbon/icons-react/es/WarningAlt";
import { Alert, AlertDescription, AlertTitle } from "@crm/ui/components/alert";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@crm/ui/components/empty";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@crm/ui/components/input-group";
import { Spinner } from "@crm/ui/components/spinner";
import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { LocalDay } from "@/components/local-date-time";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";
import {
	marchesPublicsParsers,
	marchesPublicsSearchParams,
} from "./marches-publics-search-params";

type TendersResult = RouterOutputs["tenders"]["listOuverts"];
type Tender = Extract<
	TendersResult,
	{ outcome: "ok" }
>["page"]["items"][number];

const AMOUNT_FORMATTER = new Intl.NumberFormat("fr-FR", {
	style: "currency",
	currency: "EUR",
	maximumFractionDigits: 0,
});

function formatAmount(amount: number | null): string {
	return amount == null ? "—" : AMOUNT_FORMATTER.format(amount);
}

export function MarchesPublicsList() {
	const trpc = useTRPC();
	const [values, setValues] = useQueryStates(marchesPublicsParsers);
	const input = marchesPublicsSearchParams.toInput(values);

	const result = useQuery({
		...trpc.tenders.listOuverts.queryOptions(input),
		placeholderData: (previous) => previous,
	});

	if (result.isPending) {
		return (
			<div className="flex flex-1 items-center justify-center py-12">
				<Spinner />
			</div>
		);
	}

	if (result.isError) {
		return (
			<Alert variant="destructive">
				<WarningAlt />
				<AlertTitle>Impossible de charger les marches</AlertTitle>
				<AlertDescription>{result.error.message}</AlertDescription>
			</Alert>
		);
	}

	const data = result.data;

	if (data.outcome === "not-configured") {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<WarningAlt />
					</EmptyMedia>
					<EmptyTitle>VigieProcure n&apos;est pas configure</EmptyTitle>
					<EmptyDescription>
						VIGIEPROCURE_API_URL ou VIGIEPROCURE_API_JWT est absent de
						l&apos;environnement de crm-api. Cette page reste desactivee tant
						que ces variables ne sont pas provisionnees.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	if (data.outcome === "unauthorized" || data.outcome === "failed") {
		return (
			<Alert variant="destructive">
				<WarningAlt />
				<AlertTitle>VigieProcure indisponible</AlertTitle>
				<AlertDescription>{data.reason}</AlertDescription>
			</Alert>
		);
	}

	const { page } = data;

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4">
			<div className="flex flex-wrap items-center gap-2">
				<InputGroup className="w-full sm:w-64">
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
					<InputGroupInput
						placeholder="Rechercher (objet du marche)…"
						defaultValue={values.q}
						onChange={(event) => {
							const q = event.target.value;
							setValues((prev) => ({ ...prev, q, page: 1 }));
						}}
						autoComplete="off"
					/>
				</InputGroup>
				<InputGroup className="w-full sm:w-56">
					<InputGroupInput
						placeholder="CPV (ex: 72, 4531)"
						defaultValue={values.cpv}
						onChange={(event) => {
							const cpv = event.target.value;
							setValues((prev) => ({ ...prev, cpv, page: 1 }));
						}}
						autoComplete="off"
					/>
				</InputGroup>
				<InputGroup className="w-full sm:w-40">
					<InputGroupInput
						placeholder="Departement"
						defaultValue={values.department}
						maxLength={3}
						onChange={(event) => {
							const department = event.target.value;
							setValues((prev) => ({ ...prev, department, page: 1 }));
						}}
						autoComplete="off"
					/>
				</InputGroup>
				{result.isFetching && <Spinner className="size-4" />}
			</div>

			{page.items.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyTitle>Aucun marche ne correspond</EmptyTitle>
						<EmptyDescription>
							Essayez d&apos;elargir les filtres CPV, departement ou la
							recherche texte.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<div className="min-h-0 flex-1 overflow-y-auto rounded-lg border">
					<table className="w-full text-sm">
						<thead className="sticky top-0 bg-muted/50 text-left text-xs text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">Objet</th>
								<th className="px-3 py-2 font-medium">Acheteur</th>
								<th className="px-3 py-2 font-medium">CPV</th>
								<th className="px-3 py-2 text-right font-medium">Montant</th>
								<th className="px-3 py-2 font-medium">Date limite</th>
							</tr>
						</thead>
						<tbody>
							{page.items.map((tender) => (
								<TenderRow key={tender.id} tender={tender} />
							))}
						</tbody>
					</table>
				</div>
			)}

			<div className="flex items-center justify-between gap-2">
				<span className="text-xs text-muted-foreground">
					{page.total}
					{page.totalEstPlafonne ? "+" : ""} marche
					{page.total > 1 ? "s" : ""} ouvert
					{page.total > 1 ? "s" : ""}
				</span>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={values.page <= 1}
						onClick={() =>
							setValues((prev) => ({
								...prev,
								page: Math.max(1, prev.page - 1),
							}))
						}
					>
						<ChevronLeft data-icon="inline-start" />
						Precedent
					</Button>
					<span className="text-xs text-muted-foreground">
						Page {page.page}
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={page.items.length < page.pageSize}
						onClick={() =>
							setValues((prev) => ({ ...prev, page: prev.page + 1 }))
						}
					>
						Suivant
						<ChevronRight data-icon="inline-end" />
					</Button>
				</div>
			</div>
		</div>
	);
}

function TenderRow({ tender }: { tender: Tender }) {
	return (
		<tr className="border-t">
			<td className="max-w-xs px-3 py-2">
				<span className="line-clamp-2">
					{tender.titleDisplay ?? tender.title ?? "—"}
				</span>
			</td>
			<td className="px-3 py-2 text-muted-foreground">
				{tender.buyerName ?? "—"}
			</td>
			<td className="px-3 py-2">
				{tender.cpvCode ? <Badge variant="mono">{tender.cpvCode}</Badge> : "—"}
			</td>
			<td className="px-3 py-2 text-right tabular-nums">
				{formatAmount(tender.amountEstimated)}
			</td>
			<td className="px-3 py-2">
				{tender.deadlineAt ? <LocalDay date={tender.deadlineAt} /> : "—"}
			</td>
		</tr>
	);
}
