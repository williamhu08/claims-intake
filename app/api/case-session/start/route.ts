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
import { claimIntakeRequestSchema } from "@/lib/claims/schema";

export const runtime = "nodejs";

function gatewayConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
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
  } catch {
    return Response.json({ error: "Case sessions are not configured for this environment." }, { status: 503 });
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
      );
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
    const isRateLimited = /429|rate limit|quota/i.test(message);
    const isUnauthorized = /401|unauthenticated|authentication|AI_GATEWAY_API_KEY/i.test(message);

    return Response.json(
      {
        error: isUnauthorized
          ? "AI Gateway rejected the configured API key. Check that AI_GATEWAY_API_KEY is valid and enabled for the Preview/Development environment, then refresh the preview. Your narrative has not been submitted."
          : isRateLimited
            ? "The assessment service is temporarily busy because the AI Gateway quota may be exhausted. Add credits or try again later. Your narrative has not been submitted."
            : "The assessment could not be completed. Your narrative has not been submitted. This may be due to a temporary service error or invalid AI configuration; please try again or check the project logs.",
      },
      { status: isUnauthorized ? 401 : isRateLimited ? 429 : 502 },
    );
  }
}
