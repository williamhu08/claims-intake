"use client";

/** Clearway version scope: V2. */

import { Component, type ReactNode } from "react";
import { CaseSessionInvariantFallback } from "@/components/case-session-invariant-fallback";

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
      return <CaseSessionInvariantFallback onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}
