"use client";

import { Component, type ReactNode } from "react";

type CaseSessionErrorBoundaryProps = {
  children: ReactNode;
  /** Called when the user chooses to recover. Should reset the session to a fresh state. */
  onReset: () => void;
};

type CaseSessionErrorBoundaryState = { error: Error | null };

/**
 * Catches the ResultPanel poison-pill invariant violation (a terminal case state
 * that still has unresolved facts) and any other render-time failure in the result
 * surface. This is a safety net, not a recovery path: it never re-asks a question,
 * since the fact in question has already been asked and is genuinely unresolved.
 * The only offered action is to start a new case.
 */
export class CaseSessionErrorBoundary extends Component<
  CaseSessionErrorBoundaryProps,
  CaseSessionErrorBoundaryState
> {
  state: CaseSessionErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[v0] Case session result failed its terminal-state invariant:", error);
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset();
  };

  render() {
    if (this.state.error) {
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
            The result could not be shown because it was still missing confirmed details. Rather
            than show an incomplete result, we stopped here. This case has already been asked
            about everything it could be, so please start over and a claims professional will
            follow up on anything unresolved.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-6 rounded-lg border border-border bg-background px-5 py-3 font-medium text-foreground transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Start a new claim
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
