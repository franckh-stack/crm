import { describe, expect, it } from "bun:test";
import type { GmailMessage } from "../src/google/gmail.client";
import {
	BULK_MAIL_RECIPIENT_THRESHOLD,
	parseGmailMessage,
} from "../src/google/gmail-message-parser";

function messageWith(
	headers: Record<string, string>,
	overrides: Partial<GmailMessage> = {},
): GmailMessage {
	return {
		id: "msg-1",
		payload: {
			headers: Object.entries(headers).map(([name, value]) => ({
				name,
				value,
			})),
		},
		...overrides,
	};
}

const BASE_HEADERS = {
	"message-id": "<abc123@mail.example.com>",
	from: "Damien Vignault <dvignault@scalair.fr>",
	to: "Franck <franck@vigieproc.fr>",
	cc: "Assistant <assistant@vigieproc.fr>",
	subject: "RE: appel d'offre",
	date: "Tue, 1 Sep 2026 10:00:00 +0200",
};

describe("parseGmailMessage", () => {
	it("parses a valid message into an IncomingMessage", () => {
		const parsed = parseGmailMessage(messageWith(BASE_HEADERS));

		expect(parsed).not.toBeNull();
		expect(parsed?.rfcMessageId).toBe("abc123@mail.example.com");
		expect(parsed?.from).toEqual({
			email: "dvignault@scalair.fr",
			name: "Damien Vignault",
		});
		expect(parsed?.subject).toBe("RE: appel d'offre");
	});

	it("returns null when message-id is missing", () => {
		const { "message-id": _drop, ...rest } = BASE_HEADERS;
		expect(parseGmailMessage(messageWith(rest))).toBeNull();
	});

	it("returns null when from is missing", () => {
		const { from: _drop, ...rest } = BASE_HEADERS;
		expect(parseGmailMessage(messageWith(rest))).toBeNull();
	});

	it("returns null when from cannot be parsed as an address", () => {
		expect(
			parseGmailMessage(messageWith({ ...BASE_HEADERS, from: "not-an-email" })),
		).toBeNull();
	});

	it("uses internalDate when present, over the date header", () => {
		const parsed = parseGmailMessage(
			messageWith(BASE_HEADERS, { internalDate: "1767225600000" }),
		);
		expect(parsed?.sentAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
	});

	it("falls back to the date header when internalDate is absent", () => {
		const parsed = parseGmailMessage(messageWith(BASE_HEADERS));
		expect(parsed?.sentAt.toISOString()).toBe("2026-09-01T08:00:00.000Z");
	});

	it("returns null when internalDate is invalid and there is no date header", () => {
		const { date: _drop, ...rest } = BASE_HEADERS;
		const parsed = parseGmailMessage(
			messageWith(rest, { internalDate: "not-a-number" }),
		);
		expect(parsed).toBeNull();
	});

	it("derives rootId from references when present", () => {
		const parsed = parseGmailMessage(
			messageWith({
				...BASE_HEADERS,
				references: "<root-msg@mail.example.com> <mid-msg@mail.example.com>",
			}),
		);
		expect(parsed?.rootId).toBe("root-msg@mail.example.com");
	});

	it("falls back to the normalised message-id as rootId when there is no thread history", () => {
		const parsed = parseGmailMessage(messageWith(BASE_HEADERS));
		expect(parsed?.rootId).toBe("abc123@mail.example.com");
	});

	it("splits to/cc headers into recipients with the correct kind", () => {
		const parsed = parseGmailMessage(messageWith(BASE_HEADERS));

		expect(parsed?.recipients).toEqual([
			{ email: "franck@vigieproc.fr", name: "Franck", kind: "to" },
			{ email: "assistant@vigieproc.fr", name: "Assistant", kind: "cc" },
		]);
	});

	it("returns null when a list-unsubscribe header is present -- a mailing-list broadcast, not personal correspondence", () => {
		const parsed = parseGmailMessage(
			messageWith({
				...BASE_HEADERS,
				"list-unsubscribe": "<mailto:unsubscribe@club-it.example.com>",
			}),
		);
		expect(parsed).toBeNull();
	});

	it(`returns null when there are more than ${BULK_MAIL_RECIPIENT_THRESHOLD} recipients -- a broadcast CC list, not personal correspondence`, () => {
		const manyRecipients = Array.from(
			{ length: BULK_MAIL_RECIPIENT_THRESHOLD + 1 },
			(_, i) => `person${i}@example.com`,
		).join(", ");

		const parsed = parseGmailMessage(
			messageWith({ ...BASE_HEADERS, to: manyRecipients, cc: "" }),
		);
		expect(parsed).toBeNull();
	});

	it(`still parses a message with exactly ${BULK_MAIL_RECIPIENT_THRESHOLD} recipients -- the threshold is a ceiling, not a trap`, () => {
		const recipients = Array.from(
			{ length: BULK_MAIL_RECIPIENT_THRESHOLD },
			(_, i) => `person${i}@example.com`,
		).join(", ");

		const parsed = parseGmailMessage(
			messageWith({ ...BASE_HEADERS, to: recipients, cc: "" }),
		);
		expect(parsed).not.toBeNull();
	});
});
