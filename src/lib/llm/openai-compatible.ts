import type { ChatMessage, ChatOptions, LLMProvider } from "./types";

type Config = {
  baseUrl: string;
  apiKey?: string;
  model: string;
  /** Default output budget; reasoning models spend part of it thinking, so they need more. */
  maxTokens?: number;
  /** Only sent when set (e.g. "low" for reasoning models); other providers may reject unknown fields. */
  reasoningEffort?: string;
};

/** The provider's own error text (e.g. "model decommissioned"), with anything key-like redacted, for server logs. */
async function providerReason(res: Response) {
  const body = await res.text().catch(() => "");
  let reason = body;
  try {
    const json = JSON.parse(body) as { error?: { message?: string; code?: string } | string };
    reason = typeof json.error === "string" ? json.error : [json.error?.code, json.error?.message].filter(Boolean).join(": ");
  } catch {
    // not JSON: keep the raw text
  }
  return reason
    .replace(/\b(gsk|sk|key)[-_][A-Za-z0-9_-]{8,}/gi, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 300);
}

/** Works with any endpoint that speaks POST {base}/chat/completions (Ollama, many hosted free tiers). */
export function openAICompatible({ baseUrl, apiKey, model, maxTokens, reasoningEffort }: Config): LLMProvider {
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
          max_tokens: opts.maxTokens ?? maxTokens ?? 900,
          ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
        }),
        signal: opts.signal ?? AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`LLM request failed: ${res.status} ${await providerReason(res)}`.trim());
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) {
        const reason = (json as { choices?: { finish_reason?: string }[] }).choices?.[0]?.finish_reason;
        throw new Error(`LLM returned an empty response${reason ? ` (finish_reason: ${reason})` : ""}`);
      }
      return text;
    },
  };
}
