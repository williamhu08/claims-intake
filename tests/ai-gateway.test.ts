/** Clearway version scope: V0–V2. */
import { describe, expect, it } from "vitest";

import {
  DEFAULT_AI_MODEL,
  classifyAiGatewayError,
  getAiModel,
  isAiGatewayConfigured,
} from "@/lib/ai/gateway";

describe("AI Gateway configuration", () => {
  it("uses the default model unless AI_MODEL overrides it", () => {
    expect(getAiModel({})).toBe(DEFAULT_AI_MODEL);
    expect(getAiModel({ AI_MODEL: "anthropic/claude-test" })).toBe("anthropic/claude-test");
  });

  it("accepts either supported credential", () => {
    expect(isAiGatewayConfigured({ AI_GATEWAY_API_KEY: "gateway-key" })).toBe(true);
    expect(isAiGatewayConfigured({ VERCEL_OIDC_TOKEN: "oidc-token" })).toBe(true);
    expect(isAiGatewayConfigured({})).toBe(false);
  });
});

describe("AI Gateway error classification", () => {
  it.each([
    [new Error("401 unauthenticated"), "unauthorized"],
    [new Error("GatewayRateLimitError: quota exceeded"), "rate_limited"],
    [new Error("Request timed out"), "timeout"],
    [new Error("Provider returned malformed output"), "unknown"],
    ["not an Error instance", "unknown"],
  ] as const)("classifies %s as %s", (error, expected) => {
    expect(classifyAiGatewayError(error)).toBe(expected);
  });
});
