import { describe, expect, it } from "bun:test";
import { deepseekModel } from "../agent/lib/model";

describe("deepseekModel", () => {
	it("returns a language model targeting DeepSeek's OpenAI-compatible endpoint", () => {
		const model = deepseekModel();
		expect(model.provider).toContain("deepseek");
		expect(model.modelId).toBe("deepseek-v4-flash");
		expect(model.doGenerate).toBeFunction();
		expect(model.doStream).toBeFunction();
	});
});
