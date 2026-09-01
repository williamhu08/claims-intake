/** Introduced in V2; provides safe recovery when the current V2–V3 session violates an invariant. */
type CaseSessionInvariantFallbackProps = {
  /** Called when the user chooses to recover. Should reset the session to a fresh state. */
  onReset: () => void;
};

/**
 * The safe result shown in place of ResultPanel whenever a terminal case state
 * still has a fact that was never actually put to the claimant. Used in two
 * places that must render identical messaging:
 * - IntakeForm's proactive guard, checked BEFORE ResultPanel is ever rendered.
 * - CaseSessionErrorBoundary's catch state, a defense-in-depth backstop for any
 *   other render-time failure in the result surface.
 *
 * This is a safety net, not a recovery path: it never re-asks a question, since
 * doing so risks recreating the infinite-loop bug this guards against. The only
 * offered action is to start a new case.
 */
export function CaseSessionInvariantFallback({ onReset }: CaseSessionInvariantFallbackProps) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 shadow-sm sm:p-8"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-destructive">
        Something went wrong
      </p>
      <h2 className="mt-3 font-serif text-2xl font-semibold text-foreground text-balance">
        This case could not be finalized correctly
      </h2>
      <p className="mt-2 leading-relaxed text-muted-foreground text-pretty">
        The result could not be shown because it was still missing confirmed details. Rather than
        show an incomplete result, we stopped here. This case has already been asked about
        everything it could be, so please start over and a claims professional will follow up on
        anything unresolved.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 rounded-lg border border-border bg-background px-5 py-3 font-medium text-foreground transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Start a new claim
      </button>
    </div>
  );
}
