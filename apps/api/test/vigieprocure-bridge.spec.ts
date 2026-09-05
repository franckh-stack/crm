import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { Prisma } from "@crm/db";
import {
	envoyerEvenementVigieProcure,
	vigieProcureBridge,
} from "../src/agent/vigieprocure-bridge";

let previousUrl: string | undefined;
let previousSecret: string | undefined;

beforeEach(() => {
	previousUrl = process.env.VIGIEPROCURE_WEBHOOK_URL;
	previousSecret = process.env.VIGIEPROCURE_WEBHOOK_SECRET;
	delete process.env.VIGIEPROCURE_WEBHOOK_URL;
	delete process.env.VIGIEPROCURE_WEBHOOK_SECRET;
});

afterEach(() => {
	if (previousUrl === undefined) delete process.env.VIGIEPROCURE_WEBHOOK_URL;
	else process.env.VIGIEPROCURE_WEBHOOK_URL = previousUrl;
	if (previousSecret === undefined)
		delete process.env.VIGIEPROCURE_WEBHOOK_SECRET;
	else process.env.VIGIEPROCURE_WEBHOOK_SECRET = previousSecret;
});

describe("vigieProcureBridge", () => {
	it("returns null when the secret is unset -- no bridge, not an open one", () => {
		process.env.VIGIEPROCURE_WEBHOOK_URL =
			"https://api.vigieproc.fr/api/v1/crm/webhooks";
		expect(vigieProcureBridge()).toBeNull();
	});

	it("returns null when the url is unset", () => {
		process.env.VIGIEPROCURE_WEBHOOK_SECRET = "test-secret";
		expect(vigieProcureBridge()).toBeNull();
	});

	it("returns a bridge when both url and secret are set", () => {
		process.env.VIGIEPROCURE_WEBHOOK_URL =
			"https://api.vigieproc.fr/api/v1/crm/webhooks";
		process.env.VIGIEPROCURE_WEBHOOK_SECRET = "test-secret";

		const result = vigieProcureBridge();
		expect(result).not.toBeNull();
		expect(result?.secret).toBe("test-secret");
		expect(result?.url.toString()).toBe(
			"https://api.vigieproc.fr/api/v1/crm/webhooks",
		);
	});
});

describe("envoyerEvenementVigieProcure", () => {
	it("returns false silently when no bridge is configured -- best effort, never throws", async () => {
		const logged: Prisma.InputJsonObject[] = [];
		const result = await envoyerEvenementVigieProcure(
			{ eventId: "task-1", kind: "deal.stage.changed", payload: {} },
			{ debug: (obj) => logged.push(obj) },
		);

		expect(result).toBe(false);
		expect(logged).toHaveLength(0);
	});
});
