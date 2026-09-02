/** Introduced in V2; renders the terminal intake result that precedes the V3 handoff. */
import type { CaseSessionState } from "@/lib/claims/session-schema";
import { proposedRouteLabels } from "@/lib/claims/schema";
import { CaseStateSummary } from "@/components/case-state-summary";
import { stopReasonCopy } from "@/lib/claims/display";
import { getUnaskedMissingFacts } from "@/lib/claims/terminal-invariant";
type ResultPanelProps = { session: CaseSessionState };

const missingFactLabels: Record<CaseSessionState["caseState"]["facts"][number]["key"], string> = {
  incident_cause: "The likely source or cause of the damage",
  damage_description: "A clear description of what was damaged",
  affected_property: "Which property or areas were affected",
  loss_timing: "When the incident happened or was discovered",
  active_loss_or_safety: "Whether the damage is still happening or the area is unsafe",
  injury_or_third_party: "Whether anyone was injured or another party is involved",
};

function reviewReason(stopReason: keyof typeof stopReasonCopy) {
  if (stopReason === "claimant_cannot_answer") {
    return "You chose not to guess at a detail you do not know. A claims professional can gather or verify it without treating an assumption as fact.";
  }
  if (stopReason === "safety_review") {
    return "The information may involve an active loss or safety concern that should be assessed by a person.";
  }
  if (stopReason === "safety_budget_exhausted") {
    return "The automated review reached its clarification limit before the case had enough confirmed information.";
  }
  return "The information currently available does not establish enough confirmed detail for an automated route.";
}

export function ResultPanel({ session }: ResultPanelProps) {
  const { terminal, caseState } = session;
  if (!terminal) return null;

  // Poison pill: a terminal case must never carry an unresolved fact that was
  // never actually put to the claimant. This is a defense-in-depth backstop —
  // IntakeForm already checks getUnaskedMissingFacts BEFORE ever rendering this
  // component, so this should be unreachable in practice. It exists in case a
  // future caller renders ResultPanel without that proactive guard: fail loudly
  // instead of silently rendering an incomplete "final" result. The
  // CaseSessionErrorBoundary that wraps this component catches this and shows
  // the same safe fallback IntakeForm's proactive guard would have shown.
  const unaskedMissingFacts = getUnaskedMissingFacts(session);
  // Read the raw kind as a string before any narrowing checks below, so the
  // exhaustiveness guard can still report an unexpected value at runtime even
  // though the static type only ever admits the two known literals.
  const terminalKind: string = terminal.kind;

  if (unaskedMissingFacts.length > 0) {
    if (terminalKind === "propose_route") {
      throw new Error(
        `ResultPanel invariant violated: a route proposal was terminal while facts remained unresolved (${unaskedMissingFacts.join(", ")}).`,
      );
    } else if (terminalKind === "escalate_to_human") {
      throw new Error(
        `ResultPanel invariant violated: escalation was terminal while facts were never asked (${unaskedMissingFacts.join(", ")}).`,
      );
    } else if (terminalKind === "ask_clarifying_question") {
      // ask_clarifying_question is a valid `pendingAction.kind`, but it is never
      // a valid `terminal.kind` — a session cannot be both pending a question
      // and terminal at once. Reaching this branch means the two states were
      // conflated upstream.
      throw new Error(
        `ResultPanel invariant violated: terminal.kind was "ask_clarifying_question" while facts remained unasked (${unaskedMissingFacts.join(", ")}) — a session cannot be both pending a question and terminal.`,
      );
    } else {
      // Exhaustiveness guard: terminalSessionStateSchema only ever validates
      // "propose_route" or "escalate_to_human" as terminal.kind, and
      // "ask_clarifying_question" is covered above. If any other value ever
      // reaches this component — e.g. from a future schema change that forgot
      // to add a matching branch above — fail loudly instead of silently
      // falling through with no coverage at all.
      throw new Error(`ResultPanel invariant violated: invalid terminal.kind ("${terminalKind}").`);
    }
  }

  const copy = stopReasonCopy[terminal.stopReason];

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <CaseStateSummary
        result={caseState}
        heading={caseState.missingFactKeys.length > 0 ? "Case review snapshot" : "Final case state"}
      />

      <section aria-live="polite" className="mt-8 border-t border-border pt-6">
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${terminal.kind === "propose_route" ? "bg-success" : "bg-accent"}`}
            aria-hidden="true"
          />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {terminal.kind === "propose_route" ? "Proposed route" : "Human review"}
          </p>
        </div>
        <h2 className="mt-3 font-serif text-2xl font-semibold text-foreground text-balance">{copy.heading}</h2>
        <p className="mt-2 leading-relaxed text-foreground text-pretty">{copy.description}</p>

        {terminal.kind === "propose_route" ? (
          <div className="mt-6 border-t border-border pt-6">
            <p className="text-sm font-medium text-muted-foreground">Suggested next step</p>
            <p className="mt-1 font-medium text-foreground">{proposedRouteLabels[caseState.proposedRoute.kind]}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">{terminal.rationale}</p>
            <p className="mt-3 inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              Preliminary — not a coverage or fault decision
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5 border-t border-border pt-6">
            <div>
              <p className="text-sm font-medium text-foreground">Why this needs review</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">{reviewReason(terminal.stopReason)}</p>
            </div>
            {caseState.missingFactKeys.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground">Details still to confirm</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
                  {caseState.missingFactKeys.map((key) => (
                    <li key={key}>{missingFactLabels[key]}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{copy.nextStep}</p>
              <p className="mt-3 inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                No coverage, fault, or payment decision has been made
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
