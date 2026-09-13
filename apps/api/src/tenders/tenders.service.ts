import { Injectable } from "@nestjs/common";
import type { TendersListOuvertsInput } from "./tenders.contracts";
import {
	listOpenTenders,
	type TendersResult,
} from "./vigieprocure-tenders.client";

@Injectable()
export class TendersService {
	/**
	 * Proxy en lecture seule vers l'API VigieProcure. Ne persiste rien --
	 * c'est un simple relai, pas de table Prisma dediee (cf. doctrine du
	 * chantier "bouton CRM -> API VigieProcure marches ouverts").
	 */
	async listOuverts(input: TendersListOuvertsInput): Promise<TendersResult> {
		return listOpenTenders({
			cpv: input.cpv,
			department: input.department,
			q: input.q,
			page: input.page,
			limit: input.limit,
			cursor: input.cursor,
		});
	}
}
