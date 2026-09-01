/** Introduced in V1; displays classification confidence throughout the current V2–V3 workflow. */
type ConfidenceMeterProps = {
  value: number;
};

function confidenceLabel(value: number): string {
  if (value >= 0.85) return "High confidence";
  if (value >= 0.6) return "Moderate confidence";
  if (value >= 0.4) return "Low confidence";
  return "Very low confidence";
}

export function ConfidenceMeter({ value }: ConfidenceMeterProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const percent = Math.round(clamped * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {confidenceLabel(clamped)}
        </span>
        <span className="font-serif text-2xl font-semibold tabular-nums text-foreground">
          {percent}
          <span className="text-base text-muted-foreground">%</span>
        </span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Classification confidence"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
