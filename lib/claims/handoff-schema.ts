/** Clearway version scope: V3. */
import { z } from "zod";

import {
  MAX_CASE_FACT_VALUE_LENGTH,
  MAX_ROUTE_RATIONALE_LENGTH,
  caseFactSchema,
  caseStateSchema,
} from "@/lib/claims/schema";
import {
  clarificationHistoryEntrySchema,
  terminalSessionStateSchema,
} from "@/lib/claims/session-schema";

/** V3 limits for local mock-policy and claimant-visible handoff data. */
export const MAX_MOCK_POLICY_FIXTURE_ID_LENGTH = 255;
export const MAX_MOCK_POLICY_RATIONALE_LENGTH = MAX_ROUTE_RATIONALE_LENGTH;
export const MAX_HANDOFF_RATIONALE_LENGTH = MAX_ROUTE_RATIONALE_LENGTH;

/** The only mock-policy lookup outcomes V3 may expose. */
export const mockPolicyContextStatusValues = [
  "route_supported",
  "human_review_required",
  "no_mock_record",
] as const;

/** Operational priority labels; these never decide insurance coverage or routing. */
export const operationalUrgencyValues = [
  "urgent",
  "standard",
  "human_review",
] as const;

/** The two non-binding operational outcomes V3 may return. */
export const handoffDispositionValues = [
  "property_adjuster_review",
  "human_review",
] as const;

const fixtureIdSchema = z.string().trim().min(1).max(MAX_MOCK_POLICY_FIXTURE_ID_LENGTH);
const fixtureVersionSchema = z.int().positive();
const fixtureRationaleSchema = z.string().trim().min(1).max(MAX_MOCK_POLICY_RATIONALE_LENGTH);

/**
 * Identifies which terminal water-damage sessions a local fixture may match.
 * It deliberately uses structured V2 fields only—never free-text claimant data.
 */
export const mockPolicyFixtureMatchSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("property_adjuster_route"),
    terminalKind: z.literal("propose_route"),
    stopReason: z.literal("route_supported"),
    proposedRoute: z.literal("property_adjuster_review"),
  }),
  z.object({
    kind: z.literal("other_terminal_water_damage"),
  }),
]);

/**
 * Validates one local, versioned mock-policy fixture.
 * This describes fixture data only; Step 3 performs the actual lookup.
 */
export const mockPolicyFixtureSchema = z
  .object({
    id: fixtureIdSchema,
    version: fixtureVersionSchema,
    claimType: z.literal("water_damage"),
    match: mockPolicyFixtureMatchSchema,
    policyContextStatus: z.enum(mockPolicyContextStatusValues).exclude(["no_mock_record"]),
    rationale: fixtureRationaleSchema,
  })
  .superRefine((fixture, context) => {
    const expectedStatus = fixture.match.kind === "property_adjuster_route"
      ? "route_supported"
      : "human_review_required";

    if (fixture.policyContextStatus !== expectedStatus) {
      context.addIssue({
        code: "custom",
        path: ["policyContextStatus"],
        message: `${fixture.match.kind} fixtures must use ${expectedStatus} context.`,
      });
    }
  });

/**
 * Validates the mock-policy context attached to an evaluated handoff.
 * `no_mock_record` must carry null fixture provenance so the app cannot imply
 * that a record was found.
 */
export const mockPolicyContextSchema = z.discriminatedUnion("policyContextStatus", [
  z.object({
    fixtureId: fixtureIdSchema,
    fixtureVersion: fixtureVersionSchema,
    policyContextStatus: z.literal("route_supported"),
    rationale: fixtureRationaleSchema,
  }),
  z.object({
    fixtureId: fixtureIdSchema,
    fixtureVersion: fixtureVersionSchema,
    policyContextStatus: z.literal("human_review_required"),
    rationale: fixtureRationaleSchema,
  }),
  z.object({
    fixtureId: z.null(),
    fixtureVersion: z.null(),
    policyContextStatus: z.literal("no_mock_record"),
    rationale: fixtureRationaleSchema,
  }),
]);

const activeLossOrSafetyFactSchema = caseFactSchema.extend({
  key: z.literal("active_loss_or_safety"),
  value: z.string().min(1).max(MAX_CASE_FACT_VALUE_LENGTH).optional(),
});

/**
 * Validates urgency plus the claimant-grounded safety fact that supports it.
 * Step 3 derives the level from the V2 terminal outcome and this fact; urgency
 * is evidence, not a routing decision.
 */
export const operationalUrgencySchema = z
  .discriminatedUnion("level", [
    z.object({
      level: z.literal("urgent"),
      evidenceFact: activeLossOrSafetyFactSchema,
      rationale: fixtureRationaleSchema,
    }),
    z.object({
      level: z.literal("standard"),
      evidenceFact: activeLossOrSafetyFactSchema,
      rationale: fixtureRationaleSchema,
    }),
    z.object({
      level: z.literal("human_review"),
      evidenceFact: activeLossOrSafetyFactSchema,
      rationale: fixtureRationaleSchema,
    }),
  ])
  .superRefine((urgency, context) => {
    if (urgency.level === "human_review") return;

    const expectedPrefix = urgency.level === "urgent" ? "Active:" : "Resolved:";
    const hasRequiredEvidence = (
      urgency.evidenceFact.status === "collected"
      && urgency.evidenceFact.value?.startsWith(expectedPrefix)
    );

    if (!hasRequiredEvidence) {
      context.addIssue({
        code: "custom",
        path: ["evidenceFact", "value"],
        message: `${urgency.level} urgency requires a collected ${expectedPrefix} safety fact.`,
      });
    }
  });

/**
 * Validates the V3-only result assembled from a verified terminal V2 session.
 * It prevents impossible combinations such as urgent property-adjuster
 * handling or a property handoff without route-supported mock context.
 */
export const adjusterReadyHandoffSchema = z
  .object({
    version: z.literal(1),
    caseState: caseStateSchema,
    clarificationHistory: z.array(clarificationHistoryEntrySchema),
    v2Terminal: terminalSessionStateSchema,
    mockPolicyContext: mockPolicyContextSchema,
    urgency: operationalUrgencySchema,
    finalDisposition: z.enum(handoffDispositionValues),
    rationale: z.string().trim().min(1).max(MAX_HANDOFF_RATIONALE_LENGTH),
  })
  .superRefine((handoff, context) => {
    if (handoff.finalDisposition === "property_adjuster_review") {
      if (handoff.mockPolicyContext.policyContextStatus !== "route_supported") {
        context.addIssue({
          code: "custom",
          path: ["mockPolicyContext", "policyContextStatus"],
          message: "A property-adjuster handoff requires route-supported mock policy context.",
        });
      }

      if (handoff.urgency.level !== "standard") {
        context.addIssue({
          code: "custom",
          path: ["urgency", "level"],
          message: "A property-adjuster handoff may only have standard urgency.",
        });
      }
    }

    if (handoff.urgency.level === "urgent" && handoff.finalDisposition !== "human_review") {
      context.addIssue({
        code: "custom",
        path: ["finalDisposition"],
        message: "Urgent handling requires human review.",
      });
    }
  });

/**
 * Enforces one terminal V3 API outcome: either a validated handoff or a
 * non-empty error message, but never both or neither.
 */
export const caseHandoffResponseSchema = z.union([
  z.strictObject({ handoff: adjusterReadyHandoffSchema }),
  z.strictObject({ error: z.string().trim().min(1) }),
]);

/** A validated local mock-policy fixture record. */
export type MockPolicyFixture = z.infer<typeof mockPolicyFixtureSchema>;
/** Mock fixture provenance retained in a handoff. */
export type MockPolicyContext = z.infer<typeof mockPolicyContextSchema>;
/** A validated urgency result and its supporting fact. */
export type OperationalUrgency = z.infer<typeof operationalUrgencySchema>;
/** The validated, non-binding V3 output consumed by the API route and UI. */
export type AdjusterReadyHandoff = z.infer<typeof adjusterReadyHandoffSchema>;
/** The exclusive success-or-error contract returned by the V3 handoff API. */
export type CaseHandoffResponse = z.infer<typeof caseHandoffResponseSchema>;
