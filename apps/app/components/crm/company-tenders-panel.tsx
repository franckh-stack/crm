"use client";

import Document from "@carbon/icons-react/es/Document";
import WarningAlt from "@carbon/icons-react/es/WarningAlt";
import { Alert, AlertDescription, AlertTitle } from "@crm/ui/components/alert";
import { Badge } from "@crm/ui/components/badge";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@crm/ui/components/empty";
import { Spinner } from "@crm/ui/components/spinner";
import { ToggleGroup, ToggleGroupItem } from "@crm/ui/components/toggle-group";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LocalDay } from "@/components/local-date-time";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

type TendersResult = RouterOutputs["tenders"]["listOuverts"];
type Tender = Extract<
	TendersResult,
	{ outcome: "ok" }
>["page"]["items"][number];

// "Tous" = pas de parametre `status` du tout (cf. tenders.contracts.ts) --
// donc pas de valeur "tous" dans l'union transmise a l'API, uniquement dans
// ce type d'etat local.
type StatusFilter = "active" | "awarded" | "previsionnel" | "tous";

const STATUS_LABELS = {
	active: "En cours",
	awarded: "Notifie",
	previsionnel: "Prevu",
	tous: "Tous",
} satisfies Record<StatusFilter, string>;

const STATUS_ORDER: StatusFilter[] = [
	"active",
	"awarded",
	"previsionnel",
	"tous",
];

const AMOUNT_FORMATTER = new Intl.NumberFormat("fr-FR", {
	style: "currency",
	currency: "EUR",
	maximumFractionDigits: 0,
});

function formatAmount(amount: number | null): string {
	return amount == null ? "—" : AMOUNT_FORMATTER.format(amount);
}

function isStatusFilter(value: string): value is StatusFilter {
	return (STATUS_ORDER as readonly string[]).includes(value);
}

/**
 * Onglet "Marches publics" de la fiche compte. `siren` vient de
 * `company.siren` (resolu via `CompanySirenField` sur l'onglet Overview) --
 * sans lui, impossible de savoir quels marches appartiennent a cet
 * acheteur, donc pas d'appel API.
 */
export function CompanyTendersPanel({ siren }: { siren: string | null }) {
	if (!siren) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<WarningAlt />
					</EmptyMedia>
					<EmptyTitle>SIREN non renseigne</EmptyTitle>
					<EmptyDescription>
						Resolvez le SIREN de ce compte depuis l&apos;onglet Overview pour
						afficher ses marches publics.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return <LoadedCompanyTendersPanel siren={siren} />;
}

function LoadedCompanyTendersPanel({ siren }: { siren: string }) {
	const trpc = useTRPC();
	const [status, setStatus] = useState<StatusFilter>("active");

	const result = useQuery({
		...trpc.tenders.listOuverts.queryOptions({
			siren,
			status: status === "tous" ? undefined : status,
			limit: 20,
		}),
		placeholderData: (previous) => previous,
	});

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
			<div className="flex flex-wrap items-center gap-2">
				<ToggleGroup
					type="single"
					variant="outline"
					size="sm"
					spacing={0}
					value={status}
					onValueChange={(next) => {
						if (next && isStatusFilter(next)) setStatus(next);
					}}
					aria-label="Statut des marches"
				>
					{STATUS_ORDER.map((value) => (
						<ToggleGroupItem key={value} value={value}>
							{STATUS_LABELS[value]}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				{result.isFetching ? <Spinner className="size-4" /> : null}
			</div>

			<TendersBody
				isPending={result.isPending}
				isError={result.isError}
				errorMessage={result.error?.message ?? "Erreur inconnue"}
				data={result.data}
			/>
		</div>
	);
}

function TendersBody({
	isPending,
	isError,
	errorMessage,
	data,
}: {
	isPending: boolean;
	isError: boolean;
	errorMessage: string;
	data: TendersResult | undefined;
}) {
	if (isPending) {
		return (
			<div className="flex flex-1 items-center justify-center py-12">
				<Spinner />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<Alert variant="destructive">
				<WarningAlt />
				<AlertTitle>Impossible de charger les marches</AlertTitle>
				<AlertDescription>{errorMessage}</AlertDescription>
			</Alert>
		);
	}

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
						l&apos;environnement de crm-api. Cet onglet reste desactive tant que
						ces variables ne sont pas provisionnees.
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

	if (page.items.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Document />
					</EmptyMedia>
					<EmptyTitle>Aucun marche ne correspond</EmptyTitle>
					<EmptyDescription>
						Essayez un autre statut -- ce compte n&apos;a peut-etre aucun marche
						dans celui-ci actuellement.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-2">
			<div className="min-h-0 flex-1 overflow-y-auto rounded-lg border">
				<table className="w-full text-sm">
					<thead className="sticky top-0 bg-muted/50 text-left text-xs text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Objet</th>
							<th className="px-3 py-2 font-medium">CPV</th>
							<th className="px-3 py-2 text-right font-medium">Montant</th>
							<th className="px-3 py-2 font-medium">Date</th>
						</tr>
					</thead>
					<tbody>
						{page.items.map((tender) => (
							<TenderRow key={tender.id} tender={tender} />
						))}
					</tbody>
				</table>
			</div>
			<span className="text-xs text-muted-foreground">
				{page.total}
				{page.totalEstPlafonne ? "+" : ""} marche
				{page.total > 1 ? "s" : ""}
			</span>
		</div>
	);
}

function TenderRow({ tender }: { tender: Tender }) {
	// "Notifie"/"awarded" n'a pas de date limite de depot -- publishedAt reste
	// le seul repere temporel pertinent une fois le marche attribue.
	const date =
		tender.status === "awarded" ? tender.publishedAt : tender.deadlineAt;

	return (
		<tr className="border-t">
			<td className="max-w-xs px-3 py-2">
				<span className="line-clamp-2">
					{tender.titleDisplay ?? tender.title ?? "—"}
				</span>
			</td>
			<td className="px-3 py-2">
				{tender.cpvCode ? <Badge variant="mono">{tender.cpvCode}</Badge> : "—"}
			</td>
			<td className="px-3 py-2 text-right tabular-nums">
				{formatAmount(tender.amountEstimated)}
			</td>
			<td className="px-3 py-2">{date ? <LocalDay date={date} /> : "—"}</td>
		</tr>
	);
}
