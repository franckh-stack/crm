import {
	normaliseMessageId,
	stripQuotedHistory,
} from "../mailbox/message-text";
import { parseAddress, parseAddressList } from "../mailbox/participants";
import type { IncomingMessage } from "../mailbox/thread-writer.service";
import type { GmailMessage } from "./gmail.client";
import {
	type GmailHeader,
	header,
	plainTextBody,
	rootMessageId,
} from "./gmail-mime";

/**
 * A message with more recipients than this is a broadcast/mailing-list --
 * real 1:1 or small-group business correspondence never has this many.
 * Measured on real data (WP crm-enrich, 02/09/2026): the smallest observed
 * mailing-list broadcast carried 26 recipients, the largest real 1:1 thread
 * carried 1. This threshold sits with a wide margin below that gap.
 */
export const BULK_MAIL_RECIPIENT_THRESHOLD = 5;

/**
 * Extracted verbatim from GmailSyncService's former private parse()/sentAt()
 * so the contact-history backfill can reuse it without duplicating parsing
 * logic (apps/api/src/contacts/contact-history-backfill.service.ts).
 */
export function parseGmailMessage(
	message: GmailMessage,
): IncomingMessage | null {
	const headers = message.payload?.headers;

	const rawMessageId = header(headers, "message-id");
	if (!rawMessageId) return null;

	const from = parseAddress(header(headers, "from") ?? "");
	if (!from) return null;

	if (header(headers, "list-unsubscribe")) return null;

	const sentAt = messageSentAt(message, headers);
	if (!sentAt) return null;

	const rootId = rootMessageId(headers) ?? normaliseMessageId(rawMessageId);

	const to = parseAddressList(header(headers, "to")).map((person) => ({
		email: person.email,
		name: person.name,
		kind: "to" as const,
	}));

	const cc = parseAddressList(header(headers, "cc")).map((person) => ({
		email: person.email,
		name: person.name,
		kind: "cc" as const,
	}));

	const recipients = [...to, ...cc];
	if (recipients.length > BULK_MAIL_RECIPIENT_THRESHOLD) return null;

	const body = stripQuotedHistory(plainTextBody(message.payload));

	return {
		rfcMessageId: normaliseMessageId(rawMessageId),
		rootId,
		subject: header(headers, "subject"),
		from,
		recipients,
		body,
		sentAt,
		gmailMessageId: message.id ?? null,
	};
}

function messageSentAt(
	message: GmailMessage,
	headers: readonly GmailHeader[] | undefined,
): Date | null {
	if (message.internalDate) {
		const at = new Date(Number(message.internalDate));
		if (!Number.isNaN(at.getTime())) return at;
	}

	const raw = header(headers, "date");
	if (!raw) return null;

	const at = new Date(raw);
	return Number.isNaN(at.getTime()) ? null : at;
}
