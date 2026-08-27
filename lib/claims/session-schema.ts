import { z } from "zod";

import {
  MAX_CASE_FACT_VALUE_LENGTH,
  MAX_ROUTE_RATIONALE_LENGTH,
  caseFactKeyValues,
  caseStateSchema,
  proposedRouteKindValues,
} from "@/lib/claims/schema";

/** V2 session/action limits. Keep them named so the loop has no hidden magic numbers. */
export const MAX_CLARIFICATION_FACT_KEYS = 2;
export const MAX_CLARIFICATION_QUESTION_LENGTH = 280;
export const MAX_CLARIFICATION_EXPLANATION_LENGTH = 400;

export const sessionActionKindValues = [
  "ask_clarifying_question",
  "propose_route",
  "escalate_to_human",
] as const;

export const stopReasonValues = [
  "route_supported",
  "unresolved_ambiguity",
  "claimant_cannot_answer",
  "safety_review",
  "safety_budget_exhausted",
] as const;

const factKeysSchema = z
  .array(z.enum(caseFactKeyValues))
  .min(1)
  .max(MAX_CLARIFICATION_FACT_KEYS)
  .refine((factKeys) => new Set(factKeys).size === factKeys.length, {
    message: "A clarification cannot repeat a fact key.",
  });

const claimantQuestionSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_CLARIFICATION_QUESTION_LENGTH);
const claimantExplanationSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_CLARIFICATION_EXPLANATION_LENGTH);

export const askClarifyingQuestionActionSchema = z.object({
  kind: z.literal("ask_clarifying_question"),
  question: claimantQuestionSchema,
  factKeys: factKeysSchema,
  whyItMatters: claimantExplanationSchema,
});

export const proposeRouteActionSchema = z.object({
  kind: z.literal("propose_route"),
  route: z.enum(proposedRouteKindValues),
  rationale: z.string().trim().min(1).max(MAX_ROUTE_RATIONALE_LENGTH),
});

export const escalateToHumanActionSchema = z.object({
  kind: z.literal("escalate_to_human"),
  stopReason: z.enum(stopReasonValues).exclude(["route_supported"]),
  rationale: z.string().trim().min(1).max(MAX_ROUTE_RATIONALE_LENGTH),
});

export const caseSessionActionSchema = z.discriminatedUnion("kind", [
  askClarifyingQuestionActionSchema,
  proposeRouteActionSchema,
  escalateToHumanActionSchema,
]);

export const clarificationHistoryEntrySchema = askClarifyingQuestionActionSchema.extend({
  answer: z
    .string()
    .trim()
    .min(1)
    .max(MAX_CASE_FACT_VALUE_LENGTH)
    .or(z.literal("no_response"))
    .optional(),
});

const actionTraceEntrySchema = z.object({
  kind: z.enum(sessionActionKindValues),
  at: z.string().datetime(),
});

const terminalSessionStateSchema = z.union([
  z.object({
    kind: z.literal("propose_route"),
    stopReason: z.literal("route_supported"),
    rationale: z.string().trim().min(1).max(MAX_ROUTE_RATIONALE_LENGTH),
  }),
  z.object({
    kind: z.literal("escalate_to_human"),
    stopReason: z.enum(stopReasonValues).exclude(["route_supported"]),
    rationale: z.string().trim().min(1).max(MAX_ROUTE_RATIONALE_LENGTH),
  }),
]);

export const caseSessionStateSchema = z
  .object({
    version: z.literal(1),
    issuedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    caseState: caseStateSchema,
    clarificationHistory: z.array(clarificationHistoryEntrySchema),
    pendingAction: askClarifyingQuestionActionSchema.optional(),
    actionTrace: z.array(actionTraceEntrySchema),
    terminal: terminalSessionStateSchema.optional(),
  })
  .superRefine((session, context) => {
    if (session.pendingAction && session.terminal) {
      context.addIssue({
        code: "custom",
        message: "A session cannot be pending and terminal at the same time.",
        path: ["terminal"],
      });
    }

    if (Date.parse(session.expiresAt) <= Date.parse(session.issuedAt)) {
      context.addIssue({
        code: "custom",
        message: "A session must expire after it is issued.",
        path: ["expiresAt"],
      });
    }
  });

export type CaseSessionAction = z.infer<typeof caseSessionActionSchema>;
export type CaseSessionState = z.infer<typeof caseSessionStateSchema>;
export type StopReason = (typeof stopReasonValues)[number];
