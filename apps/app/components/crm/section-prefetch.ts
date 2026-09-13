"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { companiesSearchParams } from "@/app/(app)/[slug]/companies/companies-search-params";
import { contactsSearchParams } from "@/app/(app)/[slug]/contacts/contacts-search-params";
import { dealsSearchParams } from "@/app/(app)/[slug]/deals/deals-search-params";
import { marchesPublicsSearchParams } from "@/app/(app)/[slug]/marches-publics/marches-publics-search-params";
import { useTRPC } from "@/lib/trpc/client";

export type Section =
	| "/"
	| "/companies"
	| "/contacts"
	| "/deals"
	| "/marches-publics"
	| "/settings";

export function usePrefetchSection(): (section: string) => void {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	return useCallback(
		(section: string) => {
			switch (section) {
				case "/":
					void queryClient.prefetchQuery(
						trpc.dashboard.summary.queryOptions({ scope: "me" }),
					);
					return;
				case "/companies":
					void queryClient.prefetchQuery(
						trpc.companies.list.queryOptions(
							companiesSearchParams.defaultInput(),
						),
					);
					return;
				case "/contacts":
					void queryClient.prefetchQuery(
						trpc.contacts.list.queryOptions(
							contactsSearchParams.defaultInput(),
						),
					);
					return;
				case "/deals":
					void queryClient.prefetchQuery(
						trpc.deals.list.queryOptions(dealsSearchParams.defaultInput()),
					);
					return;
				case "/marches-publics":
					void queryClient.prefetchQuery(
						trpc.tenders.listOuverts.queryOptions(
							marchesPublicsSearchParams.defaultInput(),
						),
					);
					return;
				default:
					return;
			}
		},
		[trpc, queryClient],
	);
}
