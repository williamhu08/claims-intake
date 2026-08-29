import type { CaseSessionState } from "@/lib/claims/session-schema";

/**
 * Facts still missing from the case state that were never actually put to the
 * claimant. A terminal case (propose_route or escalate_to_human) must never
 * carry one of these: a claimant declining one fact must never excuse skipping
 * a different, never-asked fact. Shared by the proactive guard in IntakeForm
 * (checked before ResultPanel is ever rendered) and the poison pill inside
 * ResultPanel itself (a defense-in-depth backstop for any other render path).
 */
export function getUnaskedMissingFacts(session: CaseSessionState): string[] {
  const askedFactKeys = new Set(session.clarificationHistory.flatMap((entry) => entry.factKeys));
  return session.caseState.missingFactKeys.filter((key) => !askedFactKeys.has(key));
}
