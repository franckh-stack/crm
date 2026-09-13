import type { Metadata } from "next";
import { Suspense } from "react";
import {
	PageShell,
	PageShellContent,
	PageShellDescription,
	PageShellHeader,
	PageShellHeading,
	PageShellLoading,
	PageShellTitle,
} from "@/components/page-shell";
import { requireSession } from "@/lib/session";
import { HydrateClient } from "@/lib/trpc/hydrate";
import { getServerQueryClient, getServerTrpc } from "@/lib/trpc/server";
import { MarchesPublicsList } from "./marches-publics-list";
import { marchesPublicsSearchParams } from "./marches-publics-search-params";

export const metadata: Metadata = {
	title: "Marches publics",
};

export default function MarchesPublicsPage({
	searchParams,
}: PageProps<"/[slug]/marches-publics">) {
	return (
		<PageShell className="min-h-0">
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle>Marches publics</PageShellTitle>
					<PageShellDescription>
						Appels d&apos;offres ouverts, via VigieProcure (BOAMP/TED/DECP).
					</PageShellDescription>
				</PageShellHeading>
			</PageShellHeader>

			<PageShellContent className="min-h-0">
				<Suspense fallback={<PageShellLoading />}>
					<MarchesPublics searchParams={searchParams} />
				</Suspense>
			</PageShellContent>
		</PageShell>
	);
}

async function MarchesPublics({
	searchParams,
}: Pick<PageProps<"/[slug]/marches-publics">, "searchParams">) {
	const [, values] = await Promise.all([
		requireSession(),
		marchesPublicsSearchParams.load(searchParams),
	]);

	const trpc = getServerTrpc();
	const queryClient = getServerQueryClient();
	// Pas de throw en cas d'echec cote VigieProcure -- `listOuverts` rend un
	// resultat degrade (`{ outcome: "not-configured" | ... }`), jamais une
	// exception. Le prefetch reste donc sans danger pour le SSR meme si
	// VIGIEPROCURE_API_JWT est absent ou si l'API distante est en panne.
	await queryClient.prefetchQuery(
		trpc.tenders.listOuverts.queryOptions(
			marchesPublicsSearchParams.toInput(values),
		),
	);

	return (
		<HydrateClient>
			<MarchesPublicsList />
		</HydrateClient>
	);
}
