/** Clearway version scope: V0. */
import { generateText, Output } from "ai";

import {
  classifyAiGatewayError,
  getAiModel,
  isAiGatewayConfigured,
} from "@/lib/ai/gateway";
import {
  claimIntakeRequestSchema,
  claimIntakeResultSchema,
} from "@/lib/claims/schema";
import { parseJsonRequest } from "@/lib/api/json-request";

export const runtime = "nodejs";

const triageInstructions = `You perform first-touch triage for ambiguous property insurance claims.

Classify the claimant's account into the single best claim type and write a concise, neutral factual summary. Use only facts explicitly stated by the claimant. Never invent facts, policy details, fault, coverage, payment eligibility, or a recommended settlement. If the account does not support a reliable category, select other_or_unclear. Confidence measures only confidence in the category classification, from 0 to 1.`;

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
      system: triageInstructions,
      prompt: `Claimant narrative:\n\n${parsedRequest.data.narrative}`,
      output: Output.object({
        name: "property_claim_intake",
        description: "A first-touch structured property-claim triage result.",
        schema: claimIntakeResultSchema,
      }),
    });

    if (!output) {
      throw new Error("The model returned no structured intake result.");
    }

    return Response.json(output);
  } catch (error) {
    console.error("Claim intake generation failed", {
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
            : "We couldn't complete the initial assessment. Check the server logs for the underlying AI Gateway or model error, then try again.",
      },
      { status: isUnauthorized ? 401 : isRateLimited ? 429 : 502 },
    );
  }
}
