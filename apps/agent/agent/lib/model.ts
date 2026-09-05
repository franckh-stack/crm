import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV4 } from "@ai-sdk/provider";

const deepseek = createOpenAI({
	baseURL: "https://api.deepseek.com/v1",
	apiKey: process.env.DEEPSEEK_API_KEY,
	// Overrides the `openai` provider id @ai-sdk/openai stamps onto the
	// model by default -- documented for exactly this "3rd party provider
	// behind the OpenAI-compatible API" case.
	name: "deepseek",
});

/**
 * DeepSeek instead of Vercel AI Gateway (VigieProcure fork adaptation, cf.
 * scripts/SPEC-fork-trycompai-crm.md Task 5) -- avoids a Vercel account
 * dependency for the main agent's LLM calls. `deepseek-v4-flash` is
 * VigieProcure's pinned DeepSeek model id, matching what its other AI
 * agents use (cf. .claude/secrets/deepseek.env in the vigieprocure repo).
 *
 * Uses `.chat(...)` explicitly, NOT calling the provider directly
 * (`deepseek(modelId)`) -- @ai-sdk/openai 4.x defaults the callable-provider
 * shorthand to the Responses API (`provider: "openai.responses"`, POSTs to
 * `/responses`), which DeepSeek's OpenAI-compatible endpoint does not
 * implement. `.chat(...)` targets `/chat/completions`, which DeepSeek does
 * support. Found empirically: the shorthand form compiled fine and only
 * failed the unit test's `provider` assertion, not at the type level.
 */
export function deepseekModel(): LanguageModelV4 {
	return deepseek.chat("deepseek-v4-flash");
}

export interface ModelSelection {
	model: string;
	modelContextWindowTokens: number;
}

/**
 * `db` and `readAgentModel` are imported lazily here (not at module scope)
 * so that this module can be imported -- e.g. for `deepseekModel()`, in
 * model.test.ts -- without eagerly initializing the Prisma client, which
 * throws at import time if DATABASE_URL/TEST_DATABASE_URL isn't set (see
 * packages/db/src/client.ts). The try/catch below already treats any
 * failure here as "no configured model", so this changes nothing about
 * this function's observable behavior.
 */
export async function selectedModel(): Promise<ModelSelection | null> {
	try {
		const { db } = await import("@crm/db");
		const { readAgentModel } = await import("@crm/db/settings");
		const setting = await readAgentModel(db);

		if (setting.isDefault) return null;

		return {
			model: setting.id,
			modelContextWindowTokens: setting.contextWindowTokens,
		};
	} catch (error) {
		console.error(
			`[agent] could not read the configured model, falling back: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
		return null;
	}
}
