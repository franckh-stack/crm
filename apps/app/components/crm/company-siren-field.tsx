"use client";

import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { EmptyCellValue } from "@crm/ui/components/empty-cell";
import { Input } from "@crm/ui/components/input";
import { Spinner } from "@crm/ui/components/spinner";
import { cn } from "@crm/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { PROPERTY_LABEL, PROPERTY_ROW } from "@/components/detail-sheet";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";

const ROW = cn(PROPERTY_ROW, "items-center");
const CONTROL =
	"h-8 w-full justify-start px-2 font-normal hover:border-input hover:bg-muted/40 border border-transparent";

function formatSiren(siren: string): string {
	return siren.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

function isValidSirenDraft(value: string): boolean {
	return value.length === 9 && /^\d+$/.test(value);
}

/**
 * Affiche le SIREN d une company, et permet de le saisir/corriger a la
 * main. La resolution automatique via la base SIRENE entreprises a ete
 * retiree : les comptes du CRM sont souvent des entites publiques
 * (mairies, hopitaux) absentes de cette base, et la resolution pouvait
 * matcher une entite homonyme sans rapport puis l'ecrire sans validation
 * humaine (decision Franck). Le SIREN est desormais un champ inline
 * editable comme les autres champs de la fiche Company, avec une garde
 * cote client (9 chiffres) avant l'appel serveur, qui reste la source de
 * verite (regex stricte dans companies.contracts.ts).
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
	const id = useId();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(siren ?? "");

	const setSirenMutation = useMutation(
		trpc.companies.setSiren.mutationOptions({
			onSuccess: async (result) => {
				if (result.outcome === "conflict") {
					toast.error(result.reason);
					return;
				}
				setEditing(false);
				await cache.company(companyId, { settle: "record" });
				toast.success(`SIREN ${formatSiren(result.siren)} enregistre.`);
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const submit = () => {
		if (!isValidSirenDraft(draft)) return;
		setSirenMutation.mutate({ id: companyId, siren: draft });
	};

	if (editing) {
		return (
			<div className={ROW}>
				<label htmlFor={id} className={PROPERTY_LABEL}>
					SIREN
				</label>
				<div className="flex min-w-0 items-center gap-1.5">
					<Input
						id={id}
						autoFocus
						inputMode="numeric"
						maxLength={9}
						value={draft}
						placeholder="123456789"
						disabled={setSirenMutation.isPending}
						onChange={(event) =>
							setDraft(event.target.value.replace(/\D/g, "").slice(0, 9))
						}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								submit();
							}
							if (event.key === "Escape") {
								setDraft(siren ?? "");
								setEditing(false);
							}
						}}
					/>
					<Button
						variant="outline"
						size="sm"
						disabled={!isValidSirenDraft(draft) || setSirenMutation.isPending}
						onClick={submit}
					>
						{setSirenMutation.isPending ? <Spinner /> : null}
						Enregistrer
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className={ROW}>
			<label htmlFor={id} className={PROPERTY_LABEL}>
				SIREN
			</label>
			<Button
				variant="ghost"
				size="sm"
				className={CONTROL}
				onClick={() => {
					setDraft(siren ?? "");
					setEditing(true);
				}}
			>
				{siren ? (
					<Badge variant="mono">{formatSiren(siren)}</Badge>
				) : (
					<span className="truncate text-muted-foreground">
						<EmptyCellValue />
					</span>
				)}
			</Button>
		</div>
	);
}
