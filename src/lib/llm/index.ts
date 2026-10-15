import "server-only";
import { mockProvider } from "./mock";
import { openAICompatible } from "./openai-compatible";
import type { LLMProvider } from "./types";

/** Selected by env only; keys never reach the browser. */
export function getLLM(): LLMProvider {
  const provider = process.env.LLM_PROVIDER ?? "mock";
  if (provider === "mock") return mockProvider;
  if (provider === "openai-compatible") {
    const baseUrl = process.env.LLM_BASE_URL;
    const model = process.env.LLM_MODEL;
    if (!baseUrl || !model) throw new Error("LLM_BASE_URL and LLM_MODEL are required");
    return openAICompatible({ baseUrl, model, apiKey: process.env.LLM_API_KEY || undefined });
  }
  throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
}
