/** Clearway version scope: V0–V2. */

export const DEFAULT_AI_MODEL = "openai/gpt-5.6-luna";

export type AiGatewayErrorKind =
  | "unauthorized"
  | "rate_limited"
  | "timeout"
  | "unknown";

type AiGatewayEnvironment = Readonly<Record<string, string | undefined>>;

/** Returns the configured AI Gateway model, falling back to Clearway's default. */
export function getAiModel(environment: AiGatewayEnvironment = process.env): string {
  return environment.AI_MODEL ?? DEFAULT_AI_MODEL;
}

/** Reports whether this environment has either supported AI Gateway credential. */
export function isAiGatewayConfigured(
  environment: AiGatewayEnvironment = process.env,
): boolean {
  return Boolean(environment.AI_GATEWAY_API_KEY || environment.VERCEL_OIDC_TOKEN);
}

/** Classifies provider errors so every model-backed route handles them consistently. */
export function classifyAiGatewayError(error: unknown): AiGatewayErrorKind {
  const message = error instanceof Error ? error.message : "";

  if (/401|unauthenticated|authentication|AI_GATEWAY_API_KEY/i.test(message)) {
    return "unauthorized";
  }

  if (/429|rate[- ]?limit|quota|GatewayRateLimitError/i.test(message)) {
    return "rate_limited";
  }

  if (/abort|aborted|timeout|timed out|deadline/i.test(message)) {
    return "timeout";
  }

  return "unknown";
}
