/** Clearway version scope: V2. */
import {
  analyzeClaimNarrative,
  selectNextCaseSessionAction,
} from "@/lib/claims/session-agent";
import { getCaseSessionConfig } from "@/lib/claims/session-config";
import {
  applyCaseSessionAction,
  createCaseSession,
  signCaseSession,
} from "@/lib/claims/session-engine";
import {
  claimIntakeRequestSchema,
  supportedClaimTypeValues,
} from "@/lib/claims/schema";
import { createMockStartSession } from "@/lib/claims/mock-session";

export const runtime = "nodejs";

function gatewayConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return /429|rate[- ]?limit|quota|GatewayRateLimitError/i.test(message);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON request with a claim narrative." }, { status: 400 });
  }

  const parsedRequest = claimIntakeRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return Response.json(
      { error: parsedRequest.error.issues[0]?.message ?? "Invalid claim narrative." },
      { status: 400 },
    );
  }

  let config: ReturnType<typeof getCaseSessionConfig>;

  try {
    config = getCaseSessionConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Case sessions are not configured for this environment.";
    return Response.json({ error: message }, { status: 503 });
  }

  if (parsedRequest.data.testingMode) {
    const session = createMockStartSession(config.ttlSeconds);
    return Response.json({
      session,
      sessionToken: signCaseSession(session, config.signingSecret),
    });
  }

  if (!gatewayConfigured()) {
    return Response.json({ error: "AI Gateway is not configured for this environment." }, { status: 503 });
  }

  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const caseState = await analyzeClaimNarrative(
        parsedRequest.data.narrative,
        config.maxInputTokens,
        config.maxWallClockMs,
        parsedRequest.data.claimType,
      );
      if (!supportedClaimTypeValues.includes(caseState.claimType as (typeof supportedClaimTypeValues)[number])) {
        return Response.json(
          { error: `We couldn't match your narrative to one of the ${supportedClaimTypeValues.length} supported claim categories. Please revise the description with more specific details and try again.` },
          { status: 422 },
        );
      }
      const session = createCaseSession(caseState, config.ttlSeconds);
      const action = await selectNextCaseSessionAction(
        session,
        config.maxClarifications,
        config.maxInputTokens,
        config.maxWallClockMs,
      );
      const nextSession = applyCaseSessionAction(session, action, config.maxClarifications);

      return Response.json({
        session: nextSession,
        sessionToken: signCaseSession(nextSession, config.signingSecret),
      });
    } catch (error) {
      lastError = error;

      // Retrying a rate-limited request cannot succeed and only consumes more of the
      // free-tier per-minute budget, so fail fast instead of amplifying the burst.
      if (isRateLimitError(error)) break;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }

  try {
    throw lastError;
  } catch (error) {
    console.error("Case-session start failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    const message = error instanceof Error ? error.message : "Unknown startup failure.";
    const isRateLimited = /429|rate[- ]?limit|quota/i.test(message);
    const isUnauthorized = /401|unauthenticated|authentication|AI_GATEWAY_API_KEY/i.test(message);

    return Response.json(
      {
        error: isUnauthorized
          ? "AI Gateway rejected the configured API key. Check that AI_GATEWAY_API_KEY is valid and enabled for the Preview/Development environment, then refresh the preview. Your narrative has not been submitted."
          : isRateLimited
            ? "The assessment service is temporarily busy because the AI Gateway quota may be exhausted. Add credits or try again later. Your narrative has not been submitted."
            : "The assessment could not be completed. Your narrative has not been submitted. Check the server logs for the underlying error — a misconfigured AI_MODEL, a transient AI Gateway outage, or a bug in the case-session logic are the likely causes.",
      },
      { status: isUnauthorized ? 401 : isRateLimited ? 429 : 502 },
    );
  }
}
