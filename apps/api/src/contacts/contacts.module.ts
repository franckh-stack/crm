import { Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { CompaniesModule } from "../companies/companies.module";
import { FieldsModule } from "../fields/fields.module";
import { GoogleModule } from "../google/google.module";
import { MailboxModule } from "../mailbox/mailbox.module";
import { TrpcModule } from "../trpc/trpc.module";
import { ContactHistoryBackfillService } from "./contact-history-backfill.service";
import { ContactsRouter } from "./contacts.router";
import { ContactsService } from "./contacts.service";

@Module({
	imports: [
		FieldsModule,
		TrpcModule,
		AgentModule,
		CompaniesModule,
		MailboxModule,
		GoogleModule,
	],
	providers: [ContactsService, ContactsRouter, ContactHistoryBackfillService],
	exports: [ContactsService],
})
export class ContactsModule {}
