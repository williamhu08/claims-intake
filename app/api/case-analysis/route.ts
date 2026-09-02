/**
 * Retained V1 structured-intake endpoint.
 *
 * POST /api/case-analysis accepts one claimant narrative, makes one AI SDK
 * structured-output call through AI Gateway, normalizes the result, and returns
 * a validated CaseState containing classification, summary, facts, missing fact
 * keys, and a nonbinding proposed route. The response is a static snapshot: this
 * route does not create a signed session, ask clarifying questions, or advance a
 * multi-turn workflow.
 *
 * The current claimant UI no longer calls this route. V2 starts with POST
 * /api/case-session/start and evolves the same CaseState concept through POST
 * /api/case-session/respond. This endpoint remains callable and tested as the
 * executable boundary between V1's fixed snapshot and V2's dynamic session.
 */
import { generateText, Output } from "ai";

import {
  classifyAiGatewayError,
  getAiModel,
  isAiGatewayConfigured,
} from "@/lib/ai/gateway";
import {
  caseAnalysisModelOutputSchema,
  claimIntakeRequestSchema,
  normalizeCaseState,
} from "@/lib/claims/schema";
import { parseJsonRequest } from "@/lib/api/json-request";

export const runtime = "nodejs";

const caseAnalysisInstructions = `You perform first-touch triage for ambiguous property insurance claims.

Extract a concise, neutral case state from the claimant narrative. Use only facts explicitly stated by the claimant. Do not invent facts, policy details, fault, coverage, payment eligibility, or a settlement recommendation.

For each fact you include, mark it collected only when the narrative explicitly supports a short value. Mark it missing when it is not stated, unclear when the narrative raises it but does not resolve it, and not_applicable only when the narrative clearly makes it irrelevant. Omit facts you cannot assess; the application will represent them as missing.

Propose a non-binding intake route. Choose liability_review only when the claimant states an injury or third-party involvement. Use human_triage_review when the account is materially ambiguous or does not support reliable routing. Confidence measures confidence in classification or the proposed route, not coverage or liability.`;

export async function POST(request: Request) {
  const parsedRequest = await parseJsonRequest(
    request,
    claimIntakeRequestSchema,
    "Send a JSON request with a claim narrative.",
    "Invalid claim narrative.",
  );
  if (!parsedRequest.success) {
    return parsedRequest.response;
  }

  if (!isAiGatewayConfigured()) {
    return Response.json(
      { error: "AI Gateway is not configured for this environment." },
      { status: 503 },
    );
  }

  try {
    const { output } = await generateText({
      model: getAiModel(),
      system: caseAnalysisInstructions,
      prompt: `Claimant narrative:\n\n${parsedRequest.data.narrative}`,
      output: Output.object({
        name: "property_claim_case_analysis",
        description: "A structured, first-touch property-claim case state.",
        schema: caseAnalysisModelOutputSchema,
      }),
    });

    if (!output) {
      throw new Error("The model returned no structured case analysis.");
    }

    return Response.json(normalizeCaseState(output));
  } catch (error) {
    console.error("Claim case-analysis generation failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    const errorKind = classifyAiGatewayError(error);
    const isRateLimited = errorKind === "rate_limited";
    const isUnauthorized = errorKind === "unauthorized";

    return Response.json(
      {
        error: isUnauthorized
          ? "AI Gateway rejected the configured API key. Check that AI_GATEWAY_API_KEY is valid and enabled for this environment, then retry."
          : isRateLimited
            ? "AI Gateway quota or rate limit was exceeded for this model. Add AI Gateway credits or wait before retrying."
            : "We couldn't complete the case analysis. Check the server logs for the underlying AI Gateway or model error, then try again.",
      },
      { status: isUnauthorized ? 401 : isRateLimited ? 429 : 502 },
    );
  }
}
