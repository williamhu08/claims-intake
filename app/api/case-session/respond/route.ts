/** Clearway version scope: V2. */
import { z } from "zod";

import {
  refreshCaseStateFromClarification,
  selectNextCaseSessionAction,
} from "@/lib/claims/session-agent";
import { getCaseSessionConfig } from "@/lib/claims/session-config";
import {
  applyCaseSessionAction,
  recordClaimantAnswer,
  signCaseSession,
  verifyCaseSession,
} from "@/lib/claims/session-engine";
import { MAX_CASE_FACT_VALUE_LENGTH } from "@/lib/claims/schema";
import { isValidClarificationAnswer } from "@/lib/claims/answer-validation";
import { createMockRespondedSession } from "@/lib/claims/mock-session";

export const runtime = "nodejs";

const responseRequestSchema = z.object({
  sessionToken: z.string().min(1),
  answer: z
    .string()
    .trim()
    .min(1)
    .max(MAX_CASE_FACT_VALUE_LENGTH)
    .or(z.literal("no_response")),
  testingMode: z.boolean().optional().default(false),
});

function gatewayConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return /429|rate[- ]?limit|quota|GatewayRateLimitError/i.test(message);
}

function isUnauthorizedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return /401|unauthenticated|authentication|AI_GATEWAY_API_KEY/i.test(message);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON session response." }, { status: 400 });
  }

  const parsedRequest = responseRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return Response.json(
      { error: parsedRequest.error.issues[0]?.message ?? "Invalid session response." },
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
    try {
      const session = verifyCaseSession(parsedRequest.data.sessionToken, getCaseSessionConfig().signingSecret);
      const nextSession = createMockRespondedSession(session, parsedRequest.data.answer);
      return Response.json({
        session: nextSession,
        sessionToken: signCaseSession(nextSession, config.signingSecret),
      });
    } catch {
      return Response.json({ error: "This testing session is invalid or has expired. Start again to continue." }, { status: 409 });
    }
  }

  if (parsedRequest.data.answer !== "no_response" && !gatewayConfigured()) {
    return Response.json({ error: "AI Gateway is not configured for this environment." }, { status: 503 });
  }

  let session;

  try {
    session = verifyCaseSession(parsedRequest.data.sessionToken, config.signingSecret);
  } catch {
    return Response.json(
      { error: "This case session is invalid or has expired. Start again to continue." },
      { status: 409 },
    );
  }

  const pendingAction = session.pendingAction;
  if (parsedRequest.data.answer !== "no_response" && (!pendingAction || !isValidClarificationAnswer(pendingAction.answerType, parsedRequest.data.answer, pendingAction.options))) {
    return Response.json({ error: "The answer does not match the requested format." }, { status: 400 });
  }

  try {
    const answeredSession = recordClaimantAnswer(session, parsedRequest.data.answer);
    // A "no_response" answer only resolves THIS question's fact as unanswerable —
    // it must not short-circuit past other unresolved facts that were never asked.
    // Always continue through the model so it can either ask the next unresolved
    // fact or, once every fact has genuinely been asked, escalate to human review.
    // The session engine (applyCaseSessionAction) still enforces that an escalation
    // cannot skip a fact that was never put to the claimant.
    const nextSession = await continueAfterAnswer(answeredSession, parsedRequest.data.answer, config);

    return Response.json({
      session: nextSession,
      sessionToken: signCaseSession(nextSession, config.signingSecret),
    });
  } catch (error) {
    console.error("Case-session response failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    const isRateLimited = isRateLimitError(error);
    const isUnauthorized = isUnauthorizedError(error);

    return Response.json(
      {
        error: isUnauthorized
          ? "AI Gateway rejected the configured API key. Check that AI_GATEWAY_API_KEY is valid and enabled for the Preview/Development environment, then refresh the preview. Your answer has not been submitted."
          : isRateLimited
            ? "The assessment service is temporarily busy because the AI Gateway free-tier rate limit was reached. Wait a moment and try again, or add AI Gateway credits. Your answer has not been submitted."
            : "This step could not be completed. Your answer has not been submitted. Check the server logs for the underlying error — a misconfigured AI_MODEL, a transient AI Gateway outage, or a bug in continueAfterAnswer are the likely causes.",
      },
      { status: isUnauthorized ? 401 : isRateLimited ? 429 : 502 },
    );
  }
}

async function continueAfterAnswer(
  session: ReturnType<typeof verifyCaseSession>,
  answer: string,
  config: ReturnType<typeof getCaseSessionConfig>,
) {
  const lastQuestion = session.clarificationHistory.at(-1)?.question;

  if (!lastQuestion) {
    throw new Error("A claimant response must correspond to a prior question.");
  }

  const caseState = await refreshCaseStateFromClarification(
    session.caseState,
    lastQuestion,
    answer,
    config.maxInputTokens,
    config.maxWallClockMs,
  );
  const refreshedSession = { ...session, caseState };
  const action = await selectNextCaseSessionAction(
    refreshedSession,
    config.maxClarifications,
    config.maxInputTokens,
    config.maxWallClockMs,
  );

  return applyCaseSessionAction(refreshedSession, action, config.maxClarifications);
}
