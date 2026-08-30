/** Clearway version scope: V3. */
import {
  adjusterReadyHandoffSchema,
  mockPolicyContextSchema,
  mockPolicyFixtureSchema,
  operationalUrgencySchema,
  type AdjusterReadyHandoff,
  type MockPolicyContext,
  type MockPolicyFixture,
  type OperationalUrgency,
} from "@/lib/claims/handoff-schema";
import type { CaseFact } from "@/lib/claims/schema";
import type { CaseSessionState } from "@/lib/claims/session-schema";

/** The source-controlled V3 demo fixture registry; no external policy service is used. */
export const mockWaterPolicyFixtures: readonly MockPolicyFixture[] = Object.freeze(
  mockPolicyFixtureSchema.array().parse([
    {
      id: "clearway-demo-water-property-adjuster-v1",
      version: 1,
      claimType: "water_damage",
      match: {
        kind: "property_adjuster_route",
        terminalKind: "propose_route",
        stopReason: "route_supported",
        proposedRoute: "property_adjuster_review",
      },
      policyContextStatus: "route_supported",
      rationale: "Demo handling context supports property-adjuster review based on the intake details provided.",
    },
    {
      id: "clearway-demo-water-human-review-v1",
      version: 1,
      claimType: "water_damage",
      match: { kind: "other_terminal_water_damage" },
      policyContextStatus: "human_review_required",
      rationale: "Demo handling context requires a person to review the intake details.",
    },
  ]),
);

/** Raised when Step 3 is given a V2 session outside the narrow V3 contract. */
export class V3HandoffEligibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "V3HandoffEligibilityError";
  }
}

/**
 * Enforces the narrow V3 input boundary for pure decision logic.
 * Token verification remains the Step 4 route's responsibility.
 */
function requireTerminalWaterSession(session: CaseSessionState) {
  if (!session.terminal) {
    throw new V3HandoffEligibilityError("V3 requires a terminal V2 session.");
  }

  if (session.caseState.claimType !== "water_damage") {
    throw new V3HandoffEligibilityError("V3 mock-policy handling is limited to water damage.");
  }

  return session;
}

/** Returns the required claimant-grounded safety fact from the V2 case state. */
function activeLossOrSafetyFact(session: CaseSessionState): CaseFact {
  const fact = session.caseState.facts.find((candidate) => candidate.key === "active_loss_or_safety");

  if (!fact) {
    throw new V3HandoffEligibilityError("V2 case state is missing the active-loss-or-safety fact.");
  }

  return fact;
}

/** Checks whether V2 ended in its supported non-binding property-adjuster route. */
function isPropertyAdjusterTerminal(session: CaseSessionState): boolean {
  return (
    session.terminal?.kind === "propose_route"
    && session.terminal.stopReason === "route_supported"
    && session.caseState.proposedRoute.kind === "property_adjuster_review"
  );
}

/**
 * Finds the sole valid fixture candidate for a structured match kind.
 * Fixture parsing is repeated here so malformed injected test/config data cannot
 * be treated as an eligible record. Duplicate matches are treated as no record
 * rather than resolving an ambiguous local configuration by array order.
 */
function fixtureForMatch(
  fixtures: readonly MockPolicyFixture[],
  matchKind: MockPolicyFixture["match"]["kind"],
): MockPolicyFixture | undefined {
  const matchingFixtures = fixtures.filter((fixture) => {
    const parsedFixture = mockPolicyFixtureSchema.safeParse(fixture);
    return parsedFixture.success && parsedFixture.data.match.kind === matchKind;
  });

  return matchingFixtures.length === 1 ? matchingFixtures[0] : undefined;
}

/**
 * Looks up one local mock-policy context from structured terminal V2 fields.
 * A missing or malformed expected fixture returns `no_mock_record`; it never
 * substitutes a different record or reads free-text claimant information.
 */
export function lookupMockPolicyContext(
  session: CaseSessionState,
  fixtures: readonly MockPolicyFixture[] = mockWaterPolicyFixtures,
): MockPolicyContext {
  requireTerminalWaterSession(session);

  const matchKind = isPropertyAdjusterTerminal(session)
    ? "property_adjuster_route"
    : "other_terminal_water_damage";
  const fixture = fixtureForMatch(fixtures, matchKind);

  if (!fixture) {
    return mockPolicyContextSchema.parse({
      fixtureId: null,
      fixtureVersion: null,
      policyContextStatus: "no_mock_record",
      rationale: "No matching demo handling record is available.",
    });
  }

  return mockPolicyContextSchema.parse({
    fixtureId: fixture.id,
    fixtureVersion: fixture.version,
    policyContextStatus: fixture.policyContextStatus,
    rationale: fixture.rationale,
  });
}

/**
 * Derives operational urgency from the terminal V2 outcome and claimant-grounded
 * safety fact. It never estimates urgency from damage amount, cost, or tone.
 */
export function deriveOperationalUrgency(
  session: CaseSessionState,
  mockPolicyContext: MockPolicyContext,
): OperationalUrgency {
  const terminalSession = requireTerminalWaterSession(session);
  const evidenceFact = activeLossOrSafetyFact(terminalSession);
  const value = evidenceFact.value ?? "";

  if (
    terminalSession.terminal?.stopReason === "safety_review"
    && evidenceFact.status === "collected"
    && value.startsWith("Active:")
  ) {
    return operationalUrgencySchema.parse({
      level: "urgent",
      evidenceFact,
      rationale: "The claimant reported an active loss or safety concern requiring urgent human review.",
    });
  }

  if (
    isPropertyAdjusterTerminal(terminalSession)
    && mockPolicyContext.policyContextStatus === "route_supported"
    && evidenceFact.status === "collected"
    && value.startsWith("Resolved:")
  ) {
    return operationalUrgencySchema.parse({
      level: "standard",
      evidenceFact,
      rationale: "The claimant reported that the loss is resolved and the area is safe.",
    });
  }

  return operationalUrgencySchema.parse({
    level: "human_review",
    evidenceFact,
    rationale: "The available intake details do not safely establish standard or urgent handling.",
  });
}

/**
 * Builds the final V3 handoff from an already verified V2 session.
 * Step 4 owns token verification; this pure function owns only deterministic
 * fixture, urgency, precedence, and handoff decisions.
 */
export function buildAdjusterReadyHandoff(
  session: CaseSessionState,
  fixtures: readonly MockPolicyFixture[] = mockWaterPolicyFixtures,
): AdjusterReadyHandoff {
  const terminalSession = requireTerminalWaterSession(session);
  const mockPolicyContext = lookupMockPolicyContext(terminalSession, fixtures);
  const urgency = deriveOperationalUrgency(terminalSession, mockPolicyContext);
  const finalDisposition = (
    isPropertyAdjusterTerminal(terminalSession)
    && mockPolicyContext.policyContextStatus === "route_supported"
    && urgency.level === "standard"
  )
    ? "property_adjuster_review"
    : "human_review";

  const rationale = finalDisposition === "property_adjuster_review"
    ? "The intake supports standard property-adjuster review under demo handling context."
    : urgency.level === "urgent"
      ? "An active loss or safety concern requires urgent human review."
      : mockPolicyContext.policyContextStatus === "no_mock_record"
        ? "A person will review the intake because no matching demo handling record is available."
        : "A person will review the intake because the available details do not support a standard property handoff.";

  return adjusterReadyHandoffSchema.parse({
    version: 1,
    caseState: terminalSession.caseState,
    clarificationHistory: terminalSession.clarificationHistory,
    v2Terminal: terminalSession.terminal,
    mockPolicyContext,
    urgency,
    finalDisposition,
    rationale,
  });
}
