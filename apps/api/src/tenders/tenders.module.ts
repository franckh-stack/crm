import { Module } from "@nestjs/common";
import { TrpcModule } from "../trpc/trpc.module";
import { TendersRouter } from "./tenders.router";
import { TendersService } from "./tenders.service";

@Module({
	imports: [TrpcModule],
	providers: [TendersService, TendersRouter],
})
export class TendersModule {}
