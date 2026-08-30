/** Clearway version scope: V1. */
import type { CaseState } from "@/lib/claims/schema";
import { caseFactSourceLabels, claimTypeDescriptions, claimTypeLabels } from "@/lib/claims/display";
import { ConfidenceMeter } from "@/components/confidence-meter";

type CaseStateSummaryProps = {
  result: CaseState;
  /** Distinguishes the mid-session snapshot from the final, terminal snapshot. */
  heading?: string;
};

type CaseFact = CaseState["facts"][number];

const missingFactQuestions: Record<CaseFact["key"], string> = {
  incident_cause: "What caused the incident?",
  damage_description: "What was damaged?",
  affected_property: "What property was affected?",
  loss_timing: "When did it happen?",
  active_loss_or_safety: "Is the damage still happening or is anyone unsafe?",
  injury_or_third_party: "Was anyone injured or is anyone else involved?",
};

export function CaseStateSummary({ result, heading = "Case state" }: CaseStateSummaryProps) {
  const collected = result.facts.filter((fact) => fact.status === "collected");
  const missing = result.facts.filter((fact) => result.missingFactKeys.includes(fact.key));

  return (
    <section aria-live="polite" className="bg-transparent p-0">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          <p className="text-xs font-medium uppercase tracking-wider text-accent">{heading}</p>
        </div>
        <span className="rounded-full border border-accent/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
          Live snapshot
        </span>
      </div>
      <div className="mt-4 space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Likely category</p>
        <h2 className="font-serif text-2xl font-semibold text-foreground text-balance">{claimTypeLabels[result.claimType]}</h2>
        <p className="text-sm text-muted-foreground text-pretty">{claimTypeDescriptions[result.claimType]}</p>
      </div>
      <div className="mt-6 space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Factual summary</p>
        <p className="leading-relaxed text-foreground text-pretty">{result.summary}</p>
      </div>
      <div className="mt-6 grid gap-6 border-t border-border pt-6 sm:grid-cols-2">
        <FactList heading="Collected facts" facts={collected} empty="No facts were confidently collected." />
        <FactList heading="Still needed" facts={missing} empty="No additional facts are marked missing." missing />
      </div>
      <div className="mt-6 border-t border-border pt-6">
        <ConfidenceMeter value={result.classificationConfidence} />
      </div>
    </section>
  );
}

function FactList({
  heading,
  facts,
  empty,
  missing = false,
}: {
  heading: string;
  facts: CaseState["facts"];
  empty: string;
  missing?: boolean;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-foreground">{heading}</h3>
      {facts.length ? (
        <ul className="mt-3 space-y-3">
          {facts.map((fact) => (
            <li key={fact.key} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {missing ? missingFactQuestions[fact.key] : fact.label}
                </p>
                {!missing && (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {caseFactSourceLabels[fact.source]}
                  </span>
                )}
              </div>
              {fact.value && <p className="mt-1 text-sm leading-relaxed text-foreground">{fact.value}</p>}
              {missing && <MissingFactExplanation fact={fact} />}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function MissingFactExplanation({ fact }: { fact: CaseFact }) {
  if (fact.status === "unclear") {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        It was mentioned, but the detail is still unclear.
      </p>
    );
  }

  if (fact.key === "active_loss_or_safety") {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        We don&apos;t know yet—for example, whether water is still leaking, there is an electrical hazard, or the area is unsafe to enter.
      </p>
    );
  }

  return <p className="mt-1 text-xs text-muted-foreground">We don&apos;t have this detail yet, so we won&apos;t assume an answer.</p>;
}
