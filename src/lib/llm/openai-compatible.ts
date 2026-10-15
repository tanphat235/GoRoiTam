import type { ChatMessage, ChatOptions, LLMProvider } from "./types";

type Config = { baseUrl: string; apiKey?: string; model: string };

/** Works with any endpoint that speaks POST {base}/chat/completions (Ollama, many hosted free tiers). */
export function openAICompatible({ baseUrl, apiKey, model }: Config): LLMProvider {
  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  return {
    name: "openai-compatible",
    async chat(messages: ChatMessage[], opts: ChatOptions = {}) {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: opts.temperature ?? 0.6,
          max_tokens: opts.maxTokens ?? 900,
        }),
        signal: opts.signal ?? AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`LLM request failed: ${res.status}`);
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("LLM returned an empty response");
      return text;
    },
  };
}
