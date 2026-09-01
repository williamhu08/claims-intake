/** Introduced in V2; advances the adaptive intake session that feeds the V3 handoff. */
import { z } from "zod";

import {
  classifyAiGatewayError,
  isAiGatewayConfigured,
} from "@/lib/ai/gateway";
import { parseJsonRequest } from "@/lib/api/json-request";
import {
  refreshCaseStateFromClarification,
  selectNextCaseSessionAction,
} from "@/lib/claims/session-agent";
import { getCaseSessionConfig } from "@/lib/claims/session-config";
import {
  applyCaseSessionAction,
  recordClaimantAnswer,
  verifyCaseSession,
} from "@/lib/claims/session-engine";
import { MAX_CASE_FACT_VALUE_LENGTH } from "@/lib/claims/schema";
import { isValidClarificationAnswer } from "@/lib/claims/answer-validation";
import { createMockRespondedSession } from "@/lib/claims/mock-session";
import { signedCaseSessionJsonResponse } from "@/lib/claims/session-response";

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

export async function POST(request: Request) {
  const parsedRequest = await parseJsonRequest(
    request,
    responseRequestSchema,
    "Send a JSON session response.",
    "Invalid session response.",
  );
  if (!parsedRequest.success) {
    return parsedRequest.response;
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
      return signedCaseSessionJsonResponse(nextSession, config.signingSecret);
    } catch {
      return Response.json({ error: "This testing session is invalid or has expired. Start again to continue." }, { status: 409 });
    }
  }

  if (parsedRequest.data.answer !== "no_response" && !isAiGatewayConfigured()) {
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

    return signedCaseSessionJsonResponse(nextSession, config.signingSecret);
  } catch (error) {
    console.error("Case-session response failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    const errorKind = classifyAiGatewayError(error);
    const isRateLimited = errorKind === "rate_limited";
    const isUnauthorized = errorKind === "unauthorized";
    const isTimedOut = errorKind === "timeout";

    return Response.json(
      {
        error: isUnauthorized
          ? "We couldn't submit your answer because the assessment service rejected its configuration. Your answer was not saved. Please try again later."
          : isRateLimited
            ? "We couldn't submit your answer because the assessment service is temporarily busy. Your answer was not saved. Please wait a moment and try again."
            : isTimedOut
              ? "We couldn't submit your answer because the assessment took too long to complete. Your answer was not saved. Please try again."
              : "We couldn't submit your answer because the assessment service encountered an unexpected problem. Your answer was not saved. Please try again.",
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
