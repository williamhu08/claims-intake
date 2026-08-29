import { createHmac, timingSafeEqual } from "node:crypto";

import {
  type CaseFact,
  type CaseState,
} from "@/lib/claims/schema";
import {
  caseSessionActionSchema,
  caseSessionStateSchema,
  type CaseSessionAction,
  type CaseSessionState,
} from "@/lib/claims/session-schema";

type Clock = () => Date;

function factFor(state: CaseState, key: CaseFact["key"]): CaseFact {
  const fact = state.facts.find((item) => item.key === key);

  if (!fact) {
    throw new Error(`CaseState is missing the required ${key} fact.`);
  }

  return fact;
}

function isWaterLoss(state: CaseState): boolean {
  return (
    state.claimType === "water_damage" ||
    (state.claimType === "other_or_unclear" && /\bwater|leak|flood/i.test(state.summary))
  );
}

export function isWaterSourceClarificationEligible(
  session: CaseSessionState,
  maxClarifications: number,
): boolean {
  if (session.terminal || session.pendingAction || !isWaterLoss(session.caseState)) {
    return false;
  }

  const cause = factFor(session.caseState, "incident_cause");
  const timing = factFor(session.caseState, "loss_timing");
  const safety = factFor(session.caseState, "active_loss_or_safety");
  const alreadyAskedCause = session.clarificationHistory.some((item) => item.factKeys.includes("incident_cause"));
  const alreadyAskedTiming = session.clarificationHistory.some((item) => item.factKeys.includes("loss_timing"));

  return (
    ((cause.status === "missing" || cause.status === "unclear") && !alreadyAskedCause) ||
    ((timing.status === "missing" || timing.status === "unclear") && !alreadyAskedTiming)
  ) && safety.status !== "unclear" && session.clarificationHistory.length < maxClarifications;
}

export function createCaseSession(
  caseState: CaseState,
  ttlSeconds: number,
  clock: Clock = () => new Date(),
): CaseSessionState {
  const issuedAt = clock();
  const expiresAt = new Date(issuedAt.getTime() + ttlSeconds * 1_000);

  return caseSessionStateSchema.parse({
    version: 1,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    caseState,
    clarificationHistory: [],
    actionTrace: [],
  });
}

export function applyCaseSessionAction(
  session: CaseSessionState,
  action: CaseSessionAction,
  maxClarifications: number,
  clock: Clock = () => new Date(),
): CaseSessionState {
  const parsedAction = caseSessionActionSchema.parse(action);

  if (session.terminal || session.pendingAction) {
    throw new Error("A terminal or pending session cannot select another action.");
  }

  if (parsedAction.kind === "ask_clarifying_question") {
    const asksEligibleFact = parsedAction.factKeys.some((key) => {
      if (key !== "incident_cause" && key !== "loss_timing") return false;
      const fact = factFor(session.caseState, key);
      const alreadyAsked = session.clarificationHistory.some((item) => item.factKeys.includes(key));
      return (fact.status === "missing" || fact.status === "unclear") && !alreadyAsked;
    });
    if (!asksEligibleFact || !isWaterSourceClarificationEligible(session, maxClarifications)) {
      throw new Error("This clarification is not eligible for the current case state.");
    }
  }

  if (parsedAction.kind === "propose_route") {
    const cause = factFor(session.caseState, "incident_cause");
    const safety = factFor(session.caseState, "active_loss_or_safety");

    if (
      parsedAction.route !== session.caseState.proposedRoute.kind ||
      cause.status === "missing" ||
      cause.status === "unclear" ||
      safety.status === "unclear"
    ) {
      throw new Error("This route is not supported by the current case state.");
    }
  }

  const traceEntry = { kind: parsedAction.kind, at: clock().toISOString() };

  if (parsedAction.kind === "ask_clarifying_question") {
    return caseSessionStateSchema.parse({
      ...session,
      pendingAction: parsedAction,
      actionTrace: [...session.actionTrace, traceEntry],
    });
  }

  return caseSessionStateSchema.parse({
    ...session,
    actionTrace: [...session.actionTrace, traceEntry],
    terminal:
      parsedAction.kind === "propose_route"
        ? {
            kind: "propose_route",
            stopReason: "route_supported",
            rationale: parsedAction.rationale,
          }
        : {
            kind: "escalate_to_human",
            stopReason: parsedAction.stopReason,
            rationale: parsedAction.rationale,
          },
  });
}

export function recordClaimantAnswer(
  session: CaseSessionState,
  answer: string | "no_response",
): CaseSessionState {
  if (!session.pendingAction) {
    throw new Error("This session has no pending clarification.");
  }

  return caseSessionStateSchema.parse({
    ...session,
    clarificationHistory: [...session.clarificationHistory, { ...session.pendingAction, answer }],
    pendingAction: undefined,
  });
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signCaseSession(session: CaseSessionState, secret: string): string {
  const payload = Buffer.from(JSON.stringify(caseSessionStateSchema.parse(session))).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyCaseSession(
  token: string,
  secret: string,
  clock: Clock = () => new Date(),
): CaseSessionState {
  const [payload, suppliedSignature, extra] = token.split(".");

  if (!payload || !suppliedSignature || extra) {
    throw new Error("Invalid case-session token.");
  }

  const expectedSignature = signature(payload, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);

  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new Error("Invalid case-session signature.");
  }

  let decoded: unknown;

  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid case-session payload.");
  }

  const session = caseSessionStateSchema.parse(decoded);

  if (Date.parse(session.expiresAt) <= clock().getTime()) {
    throw new Error("Case session has expired.");
  }

  return session;
}
