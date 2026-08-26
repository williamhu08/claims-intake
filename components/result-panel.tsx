import type { ClaimIntakeResult } from "@/lib/claims/schema";
import { claimTypeDescriptions, claimTypeLabels } from "@/lib/claims/display";
import { ConfidenceMeter } from "@/components/confidence-meter";

type ResultPanelProps = {
  result: ClaimIntakeResult;
};

export function ResultPanel({ result }: ResultPanelProps) {
  return (
    <section
      aria-live="polite"
      className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Initial assessment
        </p>
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Likely category</p>
        <h2 className="font-serif text-2xl font-semibold text-foreground text-balance">
          {claimTypeLabels[result.claimType]}
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">
          {claimTypeDescriptions[result.claimType]}
        </p>
      </div>

      <div className="mt-6 space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Neutral summary</p>
        <p className="leading-relaxed text-foreground text-pretty">{result.summary}</p>
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <ConfidenceMeter value={result.confidence} />
      </div>
    </section>
  );
}
