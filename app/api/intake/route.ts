import { generateText, Output } from "ai";

import {
  claimIntakeRequestSchema,
  claimIntakeResultSchema,
} from "@/lib/claims/schema";

export const runtime = "nodejs";

const defaultModel = "openai/gpt-5.2";

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

    return Response.json(
      { error: "We couldn't complete the initial assessment. Please try again." },
      { status: 502 },
    );
  }
}
