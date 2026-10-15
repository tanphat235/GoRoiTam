export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatOptions = { maxTokens?: number; temperature?: number; signal?: AbortSignal };

/** Provider-agnostic contract. Add a new provider by implementing this and registering it in index.ts. */
export interface LLMProvider {
  readonly name: string;
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
}
