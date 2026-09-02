import { Injectable, Logger } from "@nestjs/common";
import { CalendarSyncService } from "../google/calendar-sync.service";
import { parseGmailMessage } from "../google/gmail-message-parser";
import { GmailClient } from "../google/gmail.client";
import { MailboxTokenService } from "../mailbox/mailbox-token.service";
import { SyncStateService } from "../mailbox/sync-state.service";
import { ThreadWriterService } from "../mailbox/thread-writer.service";

export const BACKFILL_WINDOW_MONTHS = 24;
export const BACKFILL_GMAIL_MAX_RESULTS = 200;
export const BACKFILL_CALENDAR_MAX_RESULTS = 100;

export type SourceOutcome = {
	status: "synced" | "skipped";
	written: number;
	reason?: string;
};

/**
 * Automatic, per-contact Gmail/Calendar history backfill -- triggered from
 * ContactsService.create() (contacts.service.ts). The live sync is
 * forward-only by upstream design (see migration
 * 20260731210000_forward_only_sync); this fills the gap for a single named
 * contact at the moment it's created, reusing ThreadWriterService.store()
 * and CalendarSyncService.apply()/backfillForParticipant() with a
 * preresolved company/contact rather than duplicating their dedup/
 * transaction/activity-projection logic.
 */
@Injectable()
export class ContactHistoryBackfillService {
	private readonly logger = new Logger(ContactHistoryBackfillService.name);

	constructor(
		private readonly gmail: GmailClient,
		private readonly tokens: MailboxTokenService,
		private readonly state: SyncStateService,
		private readonly threads: ThreadWriterService,
		private readonly calendarSync: CalendarSyncService,
	) {}

	async run(input: {
		contactId: string;
		email: string;
		companyId: string | null;
		userId: string;
	}): Promise<{ gmail: SourceOutcome; calendar: SourceOutcome }> {
		const before = new Date();
		const after = new Date(before);
		after.setMonth(after.getMonth() - BACKFILL_WINDOW_MONTHS);

		const preresolved = {
			companyId: input.companyId,
			contactId: input.contactId,
		};

		const [gmail, calendar] = await Promise.all([
			this.backfillGmail(input.userId, input.email, after, before, preresolved).catch(
				(error: unknown) => this.failed("gmail", input.contactId, error),
			),
			this.calendarSync
				.backfillForParticipant({
					userId: input.userId,
					email: input.email,
					companyId: input.companyId,
					contactId: input.contactId,
					after,
					before,
					maxResults: BACKFILL_CALENDAR_MAX_RESULTS,
				})
				.catch((error: unknown) => this.failed("calendar", input.contactId, error)),
		]);

		return { gmail, calendar };
	}

	private async backfillGmail(
		userId: string,
		email: string,
		after: Date,
		before: Date,
		preresolved: { companyId: string | null; contactId: string | null },
	): Promise<SourceOutcome> {
		const row = await this.state.get(userId, "gmail");
		if (!row) {
			return {
				status: "skipped",
				written: 0,
				reason: "Gmail is not connected for this user.",
			};
		}

		const token = await this.tokens.accessTokenFor(userId, "gmail");
		if (token.outcome !== "ok") {
			return { status: "skipped", written: 0, reason: token.reason };
		}

		const profile = await this.gmail.profile(token.accessToken);
		if (profile.outcome !== "ok") {
			return { status: "skipped", written: 0, reason: profile.reason };
		}

		const mailbox = profile.data.emailAddress?.toLowerCase();
		if (!mailbox) {
			return {
				status: "skipped",
				written: 0,
				reason: "Gmail returned no mailbox address.",
			};
		}

		const result = await this.gmail.searchByParticipant(token.accessToken, {
			email,
			after,
			before,
			maxResults: BACKFILL_GMAIL_MAX_RESULTS,
		});
		if (result.outcome !== "ok") {
			return { status: "skipped", written: 0, reason: result.reason };
		}

		const context = await this.threads.context();
		let written = 0;

		for (const item of result.data.messages ?? []) {
			if (!item.id) continue;

			const message = await this.gmail.getMessage(token.accessToken, item.id);
			if (message.outcome !== "ok") continue;

			const parsed = parseGmailMessage(message.data);
			if (!parsed) continue;

			const stored = await this.threads.store(
				row,
				{ mailbox, origin: "gmail" },
				parsed,
				context,
				preresolved,
			);
			if (stored) written += 1;
		}

		return { status: "synced", written };
	}

	private failed(
		source: "gmail" | "calendar",
		contactId: string,
		error: unknown,
	): SourceOutcome {
		const reason = error instanceof Error ? error.message : String(error);
		this.logger.error(
			{ message: "Contact history backfill source failed", source, contactId },
			error instanceof Error ? error.stack : undefined,
		);
		return { status: "skipped", written: 0, reason };
	}
}
