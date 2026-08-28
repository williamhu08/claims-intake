import { generateText, Output } from "ai";

import {
  caseAnalysisModelOutputSchema,
  normalizeCaseState,
  type CaseState,
} from "@/lib/claims/schema";
import {
  askClarifyingQuestionInputSchema,
  escalateToHumanInputSchema,
  proposeRouteInputSchema,
  type CaseSessionAction,
  type CaseSessionState,
} from "@/lib/claims/session-schema";
import { isWaterSourceClarificationEligible } from "@/lib/claims/session-engine";

const defaultModel = "openai/gpt-5.6-luna";

const caseAnalysisInstructions = `You perform first-touch triage for ambiguous property insurance claims.

Extract a concise, neutral case state from claimant-provided information. Use only facts explicitly stated by the claimant. Do not invent facts, policy details, fault, coverage, payment eligibility, or a settlement recommendation.

For each fact you include, mark it collected only when claimant-provided information explicitly supports a short value. Mark it missing when it is not stated, unclear when it is raised but unresolved, and not_applicable only when it is clearly irrelevant. Omit facts you cannot assess; the application will represent them as missing.

Propose a non-binding intake route. Choose liability_review only when the claimant states an injury or third-party involvement. Use human_triage_review when the account is materially ambiguous or does not support reliable routing.`;

const nextActionInstructions = `You choose exactly one next action for a bounded property-claims intake session.

Use only the provided tools. Never answer with prose. Do not decide coverage, fault, liability, payment, or settlement. Ask a question only when the application made that tool available. Route only when the validated state supports it. Escalate whenever material uncertainty remains, the claimant cannot answer, or safety needs review.`;

function model() {
  return process.env.AI_MODEL ?? defaultModel;
}

export class CaseSessionSafetyBudgetError extends Error {}

function enforceInputTokenBudget(inputTokens: number | undefined, maxInputTokens: number) {
  if (inputTokens !== undefined && inputTokens > maxInputTokens) {
    throw new CaseSessionSafetyBudgetError("The case-session input-token budget was exhausted.");
  }
}

export async function analyzeClaimNarrative(
  narrative: string,
  maxInputTokens: number,
  timeout: number,
): Promise<CaseState> {
  const result = await generateText({
    model: model(),
    system: caseAnalysisInstructions,
    prompt: `Claimant narrative:\n\n${narrative}`,
    output: Output.object({
      name: "property_claim_case_analysis",
      description: "A structured, first-touch property-claim case state.",
      schema: caseAnalysisModelOutputSchema,
    }),
    maxRetries: 0,
    timeout,
  });

  enforceInputTokenBudget(result.usage.inputTokens, maxInputTokens);
  const { output } = result;

  if (!output) {
    throw new Error("The model returned no structured case analysis.");
  }

  return normalizeCaseState(output);
}

export async function refreshCaseStateFromClarification(
  previous: CaseState,
  question: string,
  answer: string,
  maxInputTokens: number,
  timeout: number,
): Promise<CaseState> {
  const result = await generateText({
    model: model(),
    system: `${caseAnalysisInstructions}\n\nPreserve previously collected facts unless the claimant's new answer explicitly corrects or adds information.`,
    prompt: `Current validated case state:\n${JSON.stringify(previous)}\n\nClarifying question:\n${question}\n\nClaimant answer:\n${answer}`,
    output: Output.object({
      name: "refreshed_property_claim_case_state",
      description: "A claimant-grounded case state refreshed after one clarification.",
      schema: caseAnalysisModelOutputSchema,
    }),
    maxRetries: 0,
    timeout,
  });

  enforceInputTokenBudget(result.usage.inputTokens, maxInputTokens);
  const { output } = result;

  if (!output) {
    throw new Error("The model returned no refreshed case state.");
  }

  const refreshed = normalizeCaseState(output);

  return {
    ...refreshed,
    facts: refreshed.facts.map((fact) => {
      const priorFact = previous.facts.find((item) => item.key === fact.key);
      const changedByAnswer =
        fact.status === "collected" &&
        (priorFact?.status !== "collected" || priorFact.value !== fact.value);

      return {
        ...fact,
        source: changedByAnswer ? "claimant_response" : priorFact?.source ?? "claimant_narrative",
      };
    }),
  };
}

/**
 * The model occasionally returns an `answerType`/`options` pair that don't agree
 * (for example, `options` attached to a `free_text` answer, or a choice
 * `answerType` with no `options`). Reconcile the mismatch here so a single
 * malformed tool call self-heals into a valid, renderable action instead of
 * throwing a Zod error that aborts the whole request.
 */
function normalizeAskClarifyingQuestionInput(input: unknown) {
  if (!input || typeof input !== "object") return input;

  const candidate = input as { answerType?: unknown; options?: unknown };
  const answerType = typeof candidate.answerType === "string" ? candidate.answerType : "free_text";
  const needsOptions = answerType === "single_choice" || answerType === "multi_choice";
  const hasValidOptions = Array.isArray(candidate.options) && candidate.options.length >= 2;

  if (needsOptions && !hasValidOptions) {
    return { ...candidate, answerType: "free_text", options: undefined };
  }

  if (!needsOptions && candidate.options !== undefined) {
    return { ...candidate, options: undefined };
  }

  return candidate;
}

export async function selectNextCaseSessionAction(
  session: CaseSessionState,
  maxClarifications: number,
  maxInputTokens: number,
  timeout: number,
): Promise<CaseSessionAction> {
  const canAskWaterSource = isWaterSourceClarificationEligible(session, maxClarifications);
  const tools = {
    ...(canAskWaterSource
      ? {
          ask_clarifying_question: {
            description:
              "Ask the one eligible material clarification question about the water source (incident_cause). Always use answerType single_choice with exactly these options: Supply line/plumbing leak; Dishwasher, fridge, or ice maker; Sink or drain backup; Roof or window leak; HVAC or condensation; Unknown. Use the exact question: Do you know what the water came from? Use whyItMatters to explain that identifying the source helps determine the appropriate intake path. Do not use a vague free-text question or invent additional categories.",
            inputSchema: askClarifyingQuestionInputSchema,
          },
        }
      : {}),
    propose_route: {
      description: "End with a non-binding intake route only when supported by the state.",
      inputSchema: proposeRouteInputSchema,
    },
    escalate_to_human: {
      description: "End with a human-review escalation when a route is not safely supported.",
      inputSchema: escalateToHumanInputSchema,
    },
  };

  const result = await generateText({
    model: model(),
    system: nextActionInstructions,
    prompt: `Validated case-session state:\n${JSON.stringify(session)}`,
    tools,
    toolChoice: "required",
    maxRetries: 0,
    timeout,
  });

  enforceInputTokenBudget(result.usage.inputTokens, maxInputTokens);

  if (result.toolCalls.length !== 1) {
    throw new Error("The model must select exactly one case-session action.");
  }

  const [toolCall] = result.toolCalls;

  if (!toolCall) {
    throw new Error("The model returned no case-session action.");
  }

  switch (toolCall.toolName) {
    case "ask_clarifying_question":
      return {
        kind: toolCall.toolName,
        ...askClarifyingQuestionInputSchema.parse(normalizeAskClarifyingQuestionInput(toolCall.input)),
      };
    case "propose_route":
      return { kind: toolCall.toolName, ...proposeRouteInputSchema.parse(toolCall.input) };
    case "escalate_to_human":
      return { kind: toolCall.toolName, ...escalateToHumanInputSchema.parse(toolCall.input) };
    default:
      throw new Error("The model selected an unsupported case-session action.");
  }
}
