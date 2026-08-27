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
    console.error("Case-session start failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return Response.json(
      { error: "We couldn't start this case session. Please try again." },
      { status: 502 },
    );
  }
}
