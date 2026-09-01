/** Introduced in V2; defines the case-session contract consumed through V3. */
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

export const clarificationAnswerTypeValues = [
  "free_text", "money", "date", "yes_no", "single_choice", "multi_choice",
  "integer", "percentage", "phone", "email", "date_time", "postal_code",
  "address", "url",
] as const;
export const clarificationAnswerTypeSchema = z.enum(clarificationAnswerTypeValues);

export const clarificationOptionSchema = z.object({
  value: z.string().trim().min(1).max(80),
  label: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .transform((label) => label.replace(/\s*\?+$/, "")),
});
export const clarificationOptionsSchema = z.array(clarificationOptionSchema).min(2).max(12);

export const askClarifyingQuestionInputSchema = z.object({
  question: claimantQuestionSchema,
  factKeys: factKeysSchema,
  whyItMatters: claimantExplanationSchema,
  answerType: clarificationAnswerTypeSchema.default("free_text"),
  options: clarificationOptionsSchema.optional(),
}).superRefine((value, context) => {
  const needsOptions = value.answerType === "single_choice" || value.answerType === "multi_choice";
  if (needsOptions && !value.options) {
    context.addIssue({ code: "custom", path: ["options"], message: "Choice clarifications require options." });
  }
  if (!needsOptions && value.options) {
    context.addIssue({ code: "custom", path: ["options"], message: "Options are only valid for choice clarifications." });
  }
});

export const askClarifyingQuestionActionSchema = askClarifyingQuestionInputSchema.extend({
  kind: z.literal("ask_clarifying_question"),
});

export const proposeRouteInputSchema = z.object({
  route: z.enum(proposedRouteKindValues),
  rationale: z.string().trim().min(1).max(MAX_ROUTE_RATIONALE_LENGTH),
});

export const proposeRouteActionSchema = proposeRouteInputSchema.extend({
  kind: z.literal("propose_route"),
});

export const escalateToHumanInputSchema = z.object({
  stopReason: z.enum(stopReasonValues).exclude(["route_supported"]),
  rationale: z.string().trim().min(1).max(MAX_ROUTE_RATIONALE_LENGTH),
});

export const escalateToHumanActionSchema = escalateToHumanInputSchema.extend({
  kind: z.literal("escalate_to_human"),
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
  at: z.iso.datetime(),
});

/** A completed V2 action; V3 reuses this to require a terminal source session. */
export const terminalSessionStateSchema = z.union([
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
    issuedAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
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

/** Shared response contract returned by both V2 session endpoints. */
export const caseSessionResponseSchema = z.object({
  session: caseSessionStateSchema,
  sessionToken: z.string().trim().min(1),
});

export type CaseSessionAction = z.infer<typeof caseSessionActionSchema>;
export type CaseSessionResponse = z.infer<typeof caseSessionResponseSchema>;
export type CaseSessionState = z.infer<typeof caseSessionStateSchema>;
export type ClarificationAnswerType = (typeof clarificationAnswerTypeValues)[number];
export type ClarificationOption = z.infer<typeof clarificationOptionSchema>;
export type StopReason = (typeof stopReasonValues)[number];
