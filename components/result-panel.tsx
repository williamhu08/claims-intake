import type { CaseSessionState } from "@/lib/claims/session-schema";
import { stopReasonCopy } from "@/lib/claims/display";
import { CaseStateSummary } from "@/components/case-state-summary";

type ResultPanelProps = { session: CaseSessionState };

const routeLabels = {
  property_adjuster_review: "Property adjuster review",
  liability_review: "Liability review",
  human_triage_review: "Human triage review",
} as const;

export function ResultPanel({ session }: ResultPanelProps) {
  const { terminal, caseState } = session;
  if (!terminal) return null;

  const copy = stopReasonCopy[terminal.stopReason];

  return (
    <div className="space-y-6">
      <section aria-live="polite" className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
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
            <p className="mt-1 font-medium text-foreground">{routeLabels[caseState.proposedRoute.kind]}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">{terminal.rationale}</p>
            <p className="mt-3 inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              Preliminary — not a coverage or fault decision
            </p>
          </div>
        ) : (
          <div className="mt-6 border-t border-border pt-6">
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{copy.nextStep}</p>
            <p className="mt-3 inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              No coverage, fault, or payment decision has been made
            </p>
          </div>
        )}
      </section>

      <CaseStateSummary result={caseState} heading="Final case state" />
    </div>
  );
}
