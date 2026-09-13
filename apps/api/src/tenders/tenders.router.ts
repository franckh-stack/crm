import { Inject } from "@nestjs/common";
import { Input, Query, Router, UseMiddlewares } from "nestjs-trpc";
import type { z } from "zod";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { restMeta } from "../trpc/openapi";
import {
	tendersListOuvertsInput,
	tendersListOuvertsOutput,
} from "./tenders.contracts";
import { TendersService } from "./tenders.service";

@Router({ alias: "tenders" })
@UseMiddlewares(AuthMiddleware)
export class TendersRouter {
	constructor(
		@Inject(TendersService) private readonly tenders: TendersService,
	) {}

	@Query({
		input: tendersListOuvertsInput,
		output: tendersListOuvertsOutput,
		meta: restMeta("GET", "/tenders/ouverts", ["Tenders"]),
	})
	async listOuverts(@Input() input: z.infer<typeof tendersListOuvertsInput>) {
		return this.tenders.listOuverts(input);
	}
}
