"use client";

/** Clearway version scope: V0–V1. */

import { useState } from "react";
import type { CaseSessionState } from "@/lib/claims/session-schema";
import { CaseStateSummary } from "@/components/case-state-summary";
import { IntakeForm } from "@/components/intake-form";

export function ClaimIntakeSection() {
  const [session, setSession] = useState<CaseSessionState | null>(null);
  const [isCaseStateOpen, setIsCaseStateOpen] = useState(false);

  return (
    <>
      <section
        className="category-panel border-y-2 border-foreground/50 transition-colors duration-200 hover:border-foreground/70"
        aria-labelledby="case-state-heading"
      >
        <button
          type="button"
          className="flex w-full items-start justify-between gap-4 px-6 py-4 text-left text-foreground"
          aria-expanded={isCaseStateOpen}
          aria-controls="case-state-content"
          onClick={() => setIsCaseStateOpen((open) => !open)}
        >
          <span>
            <span id="case-state-heading" className="block font-serif text-xl font-semibold text-foreground text-balance">
              Case state
            </span>
            {!isCaseStateOpen && (
              <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                {session ? "Updated assessment snapshot." : "Your assessment snapshot will appear here."}
              </span>
            )}
          </span>
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-4 border-[var(--circle-border)] font-mono text-lg leading-none text-[var(--circle-border)] transition-colors hover:bg-muted"
            aria-hidden="true"
          >
            {isCaseStateOpen ? "−" : "+"}
          </span>
        </button>

        <div
          id="case-state-content"
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
            isCaseStateOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
          aria-hidden={!isCaseStateOpen}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="px-6 pb-6">
              {session ? (
                <CaseStateSummary result={session.caseState} heading="Case state so far" />
              ) : (
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
                  Your assessment snapshot will appear here after you submit your description. It will show what we collected, what still needs clarification, and where each fact came from.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-10">
        <div className="mb-5">
          <h2 className="font-serif text-2xl font-semibold text-foreground text-balance sm:text-3xl">Start with what you know</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground text-pretty">Share the details you have so we can make an initial assessment.</p>
        </div>
        <IntakeForm onSessionChange={setSession} />
      </div>
    </>
  );
}
