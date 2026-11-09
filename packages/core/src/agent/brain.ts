/**
 * Model selection. One place that knows which provider means which model.
 *
 * With no key, `brain()` returns null and the engine falls back to the
 * heuristic — a genuinely tradeable deterministic strategy, not a mock. That
 * keeps `coral scan` useful on a fresh clone with zero signup.
 */
import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import type { LlmProvider } from "../config.js";

export interface Brain {
  provider: LlmProvider;
  model: LanguageModel;
}

export function brain(provider: LlmProvider, modelId: string): Brain | null {
  switch (provider) {
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY
        ? { provider, model: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(modelId) }
        : null;
    case "openai":
      return process.env.OPENAI_API_KEY
        ? { provider, model: createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(modelId) }
        : null;
    case "google":
      return process.env.GOOGLE_GENERATIVE_AI_API_KEY
        ? { provider, model: createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })(modelId) }
        : null;
    case "xai":
      return process.env.XAI_API_KEY
        ? { provider, model: createXai({ apiKey: process.env.XAI_API_KEY })(modelId) }
        : null;
    case "none":
      return null;
  }
}
