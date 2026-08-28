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

export const runtime = "nodejs";

const responseRequestSchema = z.object({
  sessionToken: z.string().min(1),
  answer: z
    .string()
    .trim()
    .min(1)
    .max(MAX_CASE_FACT_VALUE_LENGTH)
    .or(z.literal("no_response")),
});

function gatewayConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
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
  } catch {
    return Response.json({ error: "Case sessions are not configured for this environment." }, { status: 503 });
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
    const nextSession =
      parsedRequest.data.answer === "no_response"
        ? applyCaseSessionAction(
            answeredSession,
            {
              kind: "escalate_to_human",
              stopReason: "claimant_cannot_answer",
              rationale: "The claimant could not identify the material detail.",
            },
            config.maxClarifications,
          )
        : await continueAfterAnswer(answeredSession, parsedRequest.data.answer, config);

    return Response.json({
      session: nextSession,
      sessionToken: signCaseSession(nextSession, config.signingSecret),
    });
  } catch (error) {
    console.error("Case-session response failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return Response.json(
      { error: "We couldn't continue this case session. Please try again." },
      { status: 502 },
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
