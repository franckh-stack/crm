"use client";

import Renew from "@carbon/icons-react/es/Renew";
import Search from "@carbon/icons-react/es/Search";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Spinner } from "@crm/ui/components/spinner";
import { cn } from "@crm/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PROPERTY_LABEL, PROPERTY_ROW } from "@/components/detail-sheet";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

type ResolveResult = RouterOutputs["companies"]["resolveSiren"];
type SirenCandidate = Extract<
	ResolveResult,
	{ outcome: "ok" }
>["candidates"][number];

function formatSiren(siren: string): string {
	return siren.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

/**
 * Affiche le SIREN d une company, ou propose de le resoudre via
 * VigieProcure. La resolution est une mutation (jamais un effet declenche
 * au chargement) -- le clic explicite reste le seul declencheur, y compris
 * pour l'ecriture automatique sur candidat unique "exact" (doctrine
 * validee par Franck : exception ciblee et reversible, pas un backfill).
 */
export function CompanySirenField({
	companyId,
	siren,
}: {
	companyId: string;
	siren: string | null;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const [candidates, setCandidates] = useState<SirenCandidate[] | null>(null);
	const [notConfigured, setNotConfigured] = useState(false);

	const setSirenMutation = useMutation(
		trpc.companies.setSiren.mutationOptions({
			onSuccess: async (result) => {
				if (result.outcome === "conflict") {
					toast.error(result.reason);
					return;
				}
				setCandidates(null);
				await cache.company(companyId, { settle: "record" });
				toast.success(`SIREN ${formatSiren(result.siren)} enregistre.`);
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const resolve = useMutation(
		trpc.companies.resolveSiren.mutationOptions({
			onSuccess: (result) => {
				if (result.outcome === "not-configured") {
					setNotConfigured(true);
					return;
				}
				if (result.outcome === "unauthorized" || result.outcome === "failed") {
					toast.error(result.reason);
					return;
				}

				if (result.candidates.length === 0) {
					toast("Aucun SIREN trouve pour cette fiche.");
					return;
				}

				const [only, ...rest] = result.candidates;
				if (only && rest.length === 0 && only.confidence === "exact") {
					setSirenMutation.mutate({ id: companyId, siren: only.siren });
					return;
				}

				setCandidates(result.candidates);
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (siren) {
		return (
			<div className={PROPERTY_ROW}>
				<span className={PROPERTY_LABEL}>SIREN</span>
				<Badge variant="mono">{formatSiren(siren)}</Badge>
			</div>
		);
	}

	return (
		<div className={cn(PROPERTY_ROW, "items-start")}>
			<span className={cn(PROPERTY_LABEL, "pt-1.5")}>SIREN</span>
			<div className="flex min-w-0 flex-col gap-2">
				{notConfigured ? (
					<span className="text-muted-foreground text-sm">
						Resolution SIREN non configuree sur cette installation.
					</span>
				) : (
					<Button
						variant="outline"
						size="sm"
						className="w-fit"
						disabled={resolve.isPending || setSirenMutation.isPending}
						onClick={() => {
							setCandidates(null);
							resolve.mutate({ id: companyId });
						}}
					>
						{resolve.isPending || setSirenMutation.isPending ? (
							<Spinner />
						) : (
							<Icon icon={Search} data-icon="inline-start" />
						)}
						Resoudre le SIREN
					</Button>
				)}

				{candidates ? (
					<SirenCandidateList
						candidates={candidates}
						saving={setSirenMutation.isPending}
						onPick={(candidate) =>
							setSirenMutation.mutate({
								id: companyId,
								siren: candidate.siren,
							})
						}
						onRetry={() => resolve.mutate({ id: companyId })}
					/>
				) : null}
			</div>
		</div>
	);
}

function SirenCandidateList({
	candidates,
	saving,
	onPick,
	onRetry,
}: {
	candidates: SirenCandidate[];
	saving: boolean;
	onPick: (candidate: SirenCandidate) => void;
	onRetry: () => void;
}) {
	return (
		<div className="flex flex-col gap-1.5 rounded-md border bg-muted/40 p-2">
			<div className="flex items-center justify-between px-1">
				<span className="font-medium text-muted-foreground text-xs">
					{candidates.length === 1
						? "1 correspondance possible"
						: `${candidates.length} correspondances possibles`}
				</span>
				<Button
					variant="ghost"
					size="icon-xs"
					disabled={saving}
					onClick={onRetry}
					aria-label="Relancer la recherche"
				>
					<Icon icon={Renew} />
				</Button>
			</div>
			{candidates.map((candidate) => (
				<button
					key={candidate.siren}
					type="button"
					disabled={saving}
					onClick={() => onPick(candidate)}
					className="flex flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-left hover:bg-muted disabled:opacity-60"
				>
					<span className="flex w-full items-center justify-between gap-2">
						<span className="truncate font-medium text-sm">
							{candidate.nameCanonicalFull}
						</span>
						<Badge
							variant={candidate.confidence === "exact" ? "default" : "outline"}
						>
							{candidate.confidence}
						</Badge>
					</span>
					<span className="truncate text-muted-foreground text-xs">
						{[
							formatSiren(candidate.siren),
							candidate.legalFormLabel,
							candidate.city,
						]
							.filter(Boolean)
							.join(" — ")}
					</span>
				</button>
			))}
		</div>
	);
}
