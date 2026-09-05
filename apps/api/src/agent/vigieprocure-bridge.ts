import type { Prisma } from "@crm/db";

const HEADER_SIGNATURE = "X-VigieProcure-Signature";

export interface VigieProcureBridge {
	url: URL;
	secret: string;
}

/**
 * `VIGIEPROCURE_WEBHOOK_SECRET` unset means there is no bridge, not an open
 * one — the same rule `bridge()` (agent) already follows. Every caller has
 * to say what it does without VigieProcure.
 */
export function vigieProcureBridge(): VigieProcureBridge | null {
	const secret = process.env.VIGIEPROCURE_WEBHOOK_SECRET?.trim();
	const url = process.env.VIGIEPROCURE_WEBHOOK_URL?.trim();
	if (!secret || !url) return null;

	return { url: new URL(url), secret };
}

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(data),
	);
	return Buffer.from(signature).toString("hex");
}

export type VigieProcureEvent = {
	eventId: string;
	kind: string;
	payload: Prisma.InputJsonValue;
};

/**
 * Emet un evenement CRM vers VigieProcure — best-effort, echec silencieux
 * journalise (meme doctrine que `agent-trigger.service.ts::post`, le "poke"
 * vers l'agent Eve : aucun retry in-process, aucune garantie de livraison
 * ici). L'outbox minimal cote reception (persistance avant tout traitement)
 * reste la responsabilite de VigieProcure, pas de ce bridge.
 */
export async function envoyerEvenementVigieProcure(
	event: VigieProcureEvent,
	logger: { debug: (obj: Prisma.InputJsonObject) => void },
): Promise<boolean> {
	const target = vigieProcureBridge();
	if (!target) return false;

	const corps = JSON.stringify({
		event_id: event.eventId,
		kind: event.kind,
		payload: event.payload,
	});
	const signature = await hmacSha256Hex(target.secret, corps);

	try {
		const response = await fetch(target.url, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				[HEADER_SIGNATURE]: `sha256=${signature}`,
			},
			body: corps,
			signal: AbortSignal.timeout(10_000),
		});

		if (!response.ok) {
			throw new Error(`VigieProcure webhook returned ${response.status}.`);
		}

		return true;
	} catch (error) {
		logger.debug({
			message: "VigieProcure webhook did not land",
			reason: error instanceof Error ? error.message : String(error),
		});
		return false;
	}
}
