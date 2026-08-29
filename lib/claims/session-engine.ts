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

export function isClarificationEligible(
  session: CaseSessionState,
  maxClarifications: number,
): boolean {
  if (session.terminal || session.pendingAction || session.clarificationHistory.length >= maxClarifications) {
    return false;
  }

  const alreadyAsked = new Set(session.clarificationHistory.flatMap((entry) => entry.factKeys));

  return session.caseState.facts.some(
    (fact) =>
      (fact.status === "missing" || fact.status === "unclear") && !alreadyAsked.has(fact.key),
  );
}

/** @deprecated Use isClarificationEligible for all claim categories. */
export const isWaterSourceClarificationEligible = isClarificationEligible;

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
    const allFactsEligible = parsedAction.factKeys.every((key) => {
      const fact = factFor(session.caseState, key);
      return fact.status === "missing" || fact.status === "unclear";
    });
    if (!allFactsEligible || !isClarificationEligible(session, maxClarifications)) {
      throw new Error("This clarification is not eligible for the current case state.");
    }
  }

  const unresolvedFacts = session.caseState.facts.filter(
    (fact) => fact.status === "missing" || fact.status === "unclear",
  );

  if (parsedAction.kind === "propose_route") {
    if (
      parsedAction.route !== session.caseState.proposedRoute.kind ||
      unresolvedFacts.length > 0
    ) {
      throw new Error("This route is not supported while relevant case details remain unresolved.");
    }
  }

  if (parsedAction.kind === "escalate_to_human") {
    // A human escalation may only terminate the session once every unresolved fact
    // has actually been put to the claimant, regardless of the chosen stopReason.
    // A claimant who explicitly declined to answer a fact that WAS asked is already
    // covered here — that fact is in `alreadyAsked`, so it is not "unasked". The
    // stopReason must never bypass this check for facts that were never asked: doing
    // so previously let an unrelated declined fact (e.g. loss_timing) excuse escalating
    // past a completely different, never-asked fact (e.g. active_loss_or_safety).
    const alreadyAsked = new Set(session.clarificationHistory.flatMap((entry) => entry.factKeys));
    const hasUnaskedUnresolvedFact = unresolvedFacts.some((fact) => !alreadyAsked.has(fact.key));
    const budgetRemains = session.clarificationHistory.length < maxClarifications;

    if (hasUnaskedUnresolvedFact && budgetRemains) {
      throw new Error("This escalation is premature while relevant case details remain unresolved.");
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
