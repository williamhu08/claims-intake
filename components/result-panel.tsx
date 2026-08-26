import type { CaseState } from "@/lib/claims/schema";
import { claimTypeDescriptions, claimTypeLabels } from "@/lib/claims/display";
import { ConfidenceMeter } from "@/components/confidence-meter";

type ResultPanelProps = { result: CaseState };

const routeLabels = {
  property_adjuster_review: "Property adjuster review",
  liability_review: "Liability review",
  human_triage_review: "Human triage review",
} as const;

export function ResultPanel({ result }: ResultPanelProps) {
  const collected = result.facts.filter((fact) => fact.status === "collected");
  const missing = result.facts.filter((fact) => result.missingFactKeys.includes(fact.key));

  return (
    <section aria-live="polite" className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Case state</p>
      </div>
      <div className="mt-4 space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Likely category</p>
        <h2 className="font-serif text-2xl font-semibold text-foreground text-balance">{claimTypeLabels[result.claimType]}</h2>
        <p className="text-sm text-muted-foreground text-pretty">{claimTypeDescriptions[result.claimType]}</p>
      </div>
      <div className="mt-6 space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Factual summary</p>
        <p className="leading-relaxed text-foreground text-pretty">{result.summary}</p>
        <p className="text-xs text-muted-foreground">Facts shown here come from the claimant narrative.</p>
      </div>
      <div className="mt-6 grid gap-6 border-t border-border pt-6 sm:grid-cols-2">
        <FactList heading="Collected facts" facts={collected} empty="No facts were confidently collected." />
        <FactList heading="Still needed" facts={missing} empty="No additional facts are marked missing." missing />
      </div>
      <div className="mt-6 border-t border-border pt-6">
        <p className="text-sm font-medium text-muted-foreground">Proposed next route</p>
        <p className="mt-1 font-medium text-foreground">{routeLabels[result.proposedRoute.kind]}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">{result.proposedRoute.rationale}</p>
        <p className="mt-2 text-xs text-muted-foreground">This is a non-binding intake recommendation, not a coverage decision.</p>
      </div>
      <div className="mt-6 border-t border-border pt-6"><ConfidenceMeter value={result.classificationConfidence} /></div>
    </section>
  );
}

function FactList({ heading, facts, empty, missing = false }: { heading: string; facts: CaseState["facts"]; empty: string; missing?: boolean }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-foreground">{heading}</h3>
      {facts.length ? <ul className="mt-3 space-y-3">{facts.map((fact) => <li key={fact.key} className="rounded-lg border border-border bg-background p-3"><p className="text-xs font-medium text-muted-foreground">{fact.label}</p>{fact.value && <p className="mt-1 text-sm leading-relaxed text-foreground">{fact.value}</p>}{missing && <p className="mt-1 text-xs text-muted-foreground">Not stated — not an assumption.</p>}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">{empty}</p>}
    </div>
  );
}
