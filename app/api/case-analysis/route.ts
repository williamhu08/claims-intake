import { generateText, Output } from "ai";

import {
  caseAnalysisModelOutputSchema,
  claimIntakeRequestSchema,
  normalizeCaseState,
} from "@/lib/claims/schema";

export const runtime = "nodejs";

const defaultModel = "openai/gpt-5.2";

const caseAnalysisInstructions = `You perform first-touch triage for ambiguous property insurance claims.

Extract a concise, neutral case state from the claimant narrative. Use only facts explicitly stated by the claimant. Do not invent facts, policy details, fault, coverage, payment eligibility, or a settlement recommendation.

For each fact you include, mark it collected only when the narrative explicitly supports a short value. Mark it missing when it is not stated, unclear when the narrative raises it but does not resolve it, and not_applicable only when the narrative clearly makes it irrelevant. Omit facts you cannot assess; the application will represent them as missing.

Propose a non-binding intake route. Choose liability_review only when the claimant states an injury or third-party involvement. Use human_triage_review when the account is materially ambiguous or does not support reliable routing. Confidence measures confidence in classification or the proposed route, not coverage or liability.`;

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

    return Response.json(
      { error: "We couldn't complete the case analysis. Please try again." },
      { status: 502 },
    );
  }
}
