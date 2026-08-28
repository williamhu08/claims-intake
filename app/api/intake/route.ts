import { generateText, Output } from "ai";

import {
  claimIntakeRequestSchema,
  claimIntakeResultSchema,
} from "@/lib/claims/schema";

export const runtime = "nodejs";

const defaultModel = "openai/gpt-5.6-luna";

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return /429|rate[- ]?limit|quota|GatewayRateLimitError/i.test(message);
}

function isUnauthorizedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return /401|unauthenticated|authentication|AI_GATEWAY_API_KEY/i.test(message);
}

const triageInstructions = `You perform first-touch triage for ambiguous property insurance claims.

Classify the claimant's account into the single best claim type and write a concise, neutral factual summary. Use only facts explicitly stated by the claimant. Never invent facts, policy details, fault, coverage, payment eligibility, or a recommended settlement. If the account does not support a reliable category, select other_or_unclear. Confidence measures only confidence in the category classification, from 0 to 1.`;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Send a JSON request with a claim narrative." },
      { status: 400 },
    );
  }

  const parsedRequest = claimIntakeRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return Response.json(
      { error: parsedRequest.error.issues[0]?.message ?? "Invalid claim narrative." },
      { status: 400 },
    );
  }

  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return Response.json(
      { error: "AI Gateway is not configured for this environment." },
      { status: 503 },
    );
  }

  try {
    const { output } = await generateText({
      model: process.env.AI_MODEL ?? defaultModel,
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

    const isRateLimited = isRateLimitError(error);
    const isUnauthorized = isUnauthorizedError(error);

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
