/** Server-only V2 session configuration. Do not expose these values to the browser. */
export const DEFAULT_CASE_SESSION_TTL_SECONDS = 1_800;
export const DEFAULT_CASE_SESSION_MAX_INPUT_TOKENS = 12_000;
export const DEFAULT_CASE_SESSION_MAX_WALL_CLOCK_MS = 10_000;
// Must be large enough to ask about every materially unresolved fact before the
// session terminates. There are six tracked facts; a claimant narrative usually
// resolves two or three up front, so this ceiling leaves room to clarify the rest
// (one fact per question) without leaving an unasked fact stranded at triage.
export const DEFAULT_CASE_SESSION_MAX_CLARIFICATIONS = 6;

type Environment = Record<string, string | undefined>;

function positiveInteger(
  environment: Environment,
  name: string,
  defaultValue: number,
): number {
  const value = environment[name];

  if (value === undefined || value === "") {
    return defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

export function getCaseSessionConfig(environment: Environment = process.env) {
  const signingSecret = environment.CASE_SESSION_SIGNING_SECRET?.trim();

  if (!signingSecret) {
    throw new Error("CASE_SESSION_SIGNING_SECRET must be configured.");
  }

  return {
    signingSecret,
    ttlSeconds: positiveInteger(
      environment,
      "CASE_SESSION_TTL_SECONDS",
      DEFAULT_CASE_SESSION_TTL_SECONDS,
    ),
    maxInputTokens: positiveInteger(
      environment,
      "CASE_SESSION_MAX_INPUT_TOKENS",
      DEFAULT_CASE_SESSION_MAX_INPUT_TOKENS,
    ),
    maxWallClockMs: positiveInteger(
      environment,
      "CASE_SESSION_MAX_WALL_CLOCK_MS",
      DEFAULT_CASE_SESSION_MAX_WALL_CLOCK_MS,
    ),
    maxClarifications: positiveInteger(
      environment,
      "CASE_SESSION_MAX_CLARIFICATIONS",
      DEFAULT_CASE_SESSION_MAX_CLARIFICATIONS,
    ),
  };
}
