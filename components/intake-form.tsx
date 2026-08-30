"use client";

/** Clearway version scope: V0–V2. */

import { useEffect, useRef, useState } from "react";
import { useTestingMode } from "@/components/app-shell";
import {
  caseSessionStateSchema,
  type CaseSessionState,
} from "@/lib/claims/session-schema";
import { clarificationAnswerTypeHints, exampleClaims } from "@/lib/claims/display";
import { ResultPanel } from "@/components/result-panel";
import { CaseSessionErrorBoundary } from "@/components/case-session-error-boundary";
import { CaseSessionInvariantFallback } from "@/components/case-session-invariant-fallback";
import { getUnaskedMissingFacts } from "@/lib/claims/terminal-invariant";
import {
  ClarificationInput,
  isClarificationAnswerValid,
} from "@/components/clarification-input";

const MIN_LENGTH = 20;
const MAX_LENGTH = 4000;

type IntakeFormProps = {
  onSessionChange?: (session: CaseSessionState | null) => void;
};

export function IntakeForm({ onSessionChange }: IntakeFormProps) {
  const testingMode = useTestingMode();
  const [narrative, setNarrative] = useState("");
  const [session, setSession] = useState<CaseSessionState | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [requestState, setRequestState] = useState<"idle" | "submitting" | "active" | "responding" | "terminal" | "error">("idle");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const abortController = useRef<AbortController | null>(null);
  const retryAction = useRef<(() => void) | null>(null);
  const [errorRecovery, setErrorRecovery] = useState<"retry" | "reset" | null>(null);
  const [showTryAnother, setShowTryAnother] = useState(false);

  useEffect(() => {
    if (!session?.terminal) return;

    const timer = window.setTimeout(() => setShowTryAnother(true), 1000);
    return () => window.clearTimeout(timer);
  }, [session?.terminal]);

  const trimmedLength = narrative.trim().length;
  const tooShort = trimmedLength > 0 && trimmedLength < MIN_LENGTH;
  const isSubmittingNarrative = requestState === "submitting";
  const isRespondingToClarification = requestState === "responding";
  const loading = isSubmittingNarrative || isRespondingToClarification;
  const pendingAction = session?.pendingAction;
  const answerIsValid = pendingAction
    ? isClarificationAnswerValid(pendingAction.answerType, answer)
    : false;
  const isNoResponse = answer === "no_response";
  const hasActiveSession = Boolean(sessionToken);
  const canSubmit = trimmedLength >= MIN_LENGTH && trimmedLength <= MAX_LENGTH && !loading && !hasActiveSession;

  function updateSession(nextSession: CaseSessionState | null) {
    setSession(nextSession);
    onSessionChange?.(nextSession);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    const submittedNarrative = narrative.trim();
    const version = ++requestVersion.current;
    abortController.current?.abort();
    abortController.current = new AbortController();
    setRequestState("submitting");
    setShowTryAnother(false);
    setError(null);
    setErrorRecovery(null);
    retryAction.current = () => void handleSubmit({ preventDefault: () => undefined } as React.FormEvent);
    updateSession(null);
    setSessionToken(null);

    try {
      const response = await fetch("/api/case-session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative: submittedNarrative, testingMode }),
        signal: abortController.current.signal,
      });
      if (version !== requestVersion.current) return;

      let data: unknown;

      try {
        data = await response.json();
      } catch {
        setRequestState("error");
        setErrorRecovery("reset");
        setError("The server sent a response that wasn't valid JSON. The session could not be safely continued.");
        return;
      }

      if (!response.ok) {
        setRequestState("error");
        setErrorRecovery(response.status >= 500 ? "retry" : "reset");
        setError(getErrorMessage(data));
        return;
      }

      const parsed = parseSessionStartResponse(data);
      if (!parsed) {
        setRequestState("error");
        setErrorRecovery("reset");
        setError("The assessment returned an incomplete session. For safety, this session cannot continue; please start over.");
        return;
      }

      updateSession(parsed.session);
      setSessionToken(parsed.sessionToken);
      setRequestState(parsed.session.terminal ? "terminal" : "active");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (version !== requestVersion.current) return;
      setRequestState("error");
      setErrorRecovery("retry");
      setError("The request could not reach the assessment service. Your narrative is still available, and you can try again.");
    }
  }

  async function submitAnswer(value: string) {
    if (!sessionToken || !pendingAction || loading) return;
    setRequestState("responding");
    setShowTryAnother(false);
    setError(null);
    setErrorRecovery(null);
    retryAction.current = () => void submitAnswer(value);

    try {
      const response = await fetch("/api/case-session/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, answer: value, testingMode }),
      });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(data));
      const parsed = parseSessionStartResponse(data);
      if (!parsed) throw new Error("The session response didn't match the expected shape. Check /api/case-session/respond for a schema mismatch between the server payload and caseSessionStateSchema.");
      updateSession(parsed.session);
      setSessionToken(parsed.sessionToken);
      setAnswer("");
      setRequestState(parsed.session.terminal ? "terminal" : "active");
    } catch (error) {
      setRequestState("error");
      const message = error instanceof Error ? error.message : "The clarification could not be submitted.";
      setErrorRecovery(message.includes("expired") || message.includes("invalid") || message.includes("shape") ? "reset" : "retry");
      setError(message);
    }
  }

  async function handleAnswerSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!answerIsValid || isNoResponse) return;
    await submitAnswer(answer.trim());
  }

  function applyExample(text: string) {
    abortController.current?.abort();
    requestVersion.current += 1;
    setNarrative(text);
    setError(null);
    updateSession(null);
    setSessionToken(null);
    setRequestState("idle");
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        aria-busy={isSubmittingNarrative}
        className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Try an example
          </span>
          {exampleClaims.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => applyExample(example.narrative)}
              disabled={testingMode && example.label !== "Unknown water source"}
              aria-disabled={testingMode && example.label !== "Unknown water source"}
              title={testingMode && example.label !== "Unknown water source" ? "Only Unknown water source is available in testing mode" : undefined}
              className="rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-border disabled:hover:text-foreground"
            >
              {example.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <label htmlFor="narrative" className="block text-sm font-medium text-foreground">
            Describe what happened
          </label>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Use your own words. Include what was damaged and how, but only what you actually know.
          </p>
          <textarea
            id="narrative"
            name="narrative"
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            readOnly={hasActiveSession}
            rows={7}
            maxLength={MAX_LENGTH}
            placeholder="e.g. A pipe burst under the kitchen sink overnight and flooded the cabinet and floor..."
            aria-invalid={tooShort}
            aria-describedby="narrative-hint"
            className="mt-3 w-full resize-y rounded-lg border border-input bg-background p-4 leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div id="narrative-hint" className="mt-2 flex items-center justify-between text-sm">
            <span className={tooShort ? "text-destructive" : "text-muted-foreground"}>
              {tooShort
                ? `At least ${MIN_LENGTH} characters — add a little more detail.`
                : "Minimum 20 characters."}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {trimmedLength}/{MAX_LENGTH}
            </span>
          </div>
        </div>

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {isSubmittingNarrative ? "Starting your assessment." : ""}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {isSubmittingNarrative ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground"
                aria-hidden="true"
              />
              Starting assessment…
            </>
          ) : (
            "Get initial assessment"
          )}
        </button>

        {hasActiveSession && (
          <button
            type="button"
            onClick={resetSession}
            className="mt-4 block text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Edit narrative / start over
          </button>
        )}
      </form>

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <p>{error}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {errorRecovery === "retry" && retryAction.current && (
              <button type="button" onClick={() => retryAction.current?.()} disabled={loading} className="rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground disabled:opacity-50">
                Try again
              </button>
            )}
            <button type="button" onClick={resetSession} className="rounded-lg border border-border bg-background px-3 py-2 font-medium text-foreground">
              Start over
            </button>
          </div>
        </div>
      )}

      {session && session.clarificationHistory.length > 0 && (
        <div className="space-y-4">
          {session.clarificationHistory.map((entry, index) => (
            <div
              key={`${entry.question}-${index}`}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h2 className="text-lg font-semibold text-foreground">{entry.question}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.whyItMatters}</p>
              <p className="mt-5 text-sm font-medium text-foreground">Your answer</p>
              <ClarificationInput
                answerType={entry.answerType}
                value={entry.answer === "no_response" ? "I don't know" : entry.answer ?? ""}
                onChange={() => undefined}
                options={entry.options}
                disabled
                describedBy={`answered-clarification-${index}`}
              />
              <p id={`answered-clarification-${index}`} className="mt-2 text-sm text-muted-foreground">
                Answer submitted.
              </p>
            </div>
          ))}
        </div>
      )}

      {pendingAction && (
        <form onSubmit={handleAnswerSubmit} className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">{pendingAction.question}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{pendingAction.whyItMatters}</p>
          <label htmlFor="clarification-answer" className="mt-5 block text-sm font-medium text-foreground">
            Your answer
          </label>
          <ClarificationInput
            answerType={pendingAction.answerType}
            value={answer}
            onChange={setAnswer}
            options={pendingAction.options}
            disabled={loading}
            describedBy="clarification-hint"
          />
          {clarificationAnswerTypeHints[pendingAction.answerType] ? (
            <p id="clarification-hint" className="mt-2 text-sm text-muted-foreground">
              {clarificationAnswerTypeHints[pendingAction.answerType]}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={!answerIsValid || loading} className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
              {isRespondingToClarification ? "Saving…" : "Continue"}
            </button>
            <button type="button" disabled={loading} onClick={() => submitAnswer("no_response")} className="text-sm font-medium text-muted-foreground underline underline-offset-4 disabled:opacity-50">
              I don&apos;t know
            </button>
          </div>
        </form>
      )}

      {session?.terminal && (
        getUnaskedMissingFacts(session).length === 0 ? (
          // Proactive guard: only reaches ResultPanel once every missing fact has
          // actually been put to the claimant. The CaseSessionErrorBoundary below
          // remains as a defense-in-depth backstop for any other render failure.
          <CaseSessionErrorBoundary key={sessionToken ?? "no-session"} onReset={resetSession}>
            <ResultPanel session={session} />
          </CaseSessionErrorBoundary>
        ) : (
          // The terminal case still has a fact that was never asked — never render
          // an incomplete "final" result. Show the same safe fallback instead of
          // attempting ResultPanel at all.
          <CaseSessionInvariantFallback onReset={resetSession} />
        )
      )}

      {session?.terminal && (
        <div
          aria-hidden={!showTryAnother}
          className={`flex justify-center transition-opacity duration-700 ease-out ${showTryAnother ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <button
            type="button"
            tabIndex={showTryAnother ? 0 : -1}
            onClick={resetSession}
            className="rounded-lg border border-success bg-success px-5 py-3 font-medium text-success-foreground transition-colors hover:bg-success/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Want to try another claim?
          </button>
        </div>
      )}
    </div>
  );

  function resetSession() {
    abortController.current?.abort();
    requestVersion.current += 1;
    setNarrative("");
    updateSession(null);
    setSessionToken(null);
    setRequestState("idle");
    setAnswer("");
    setError(null);
    setErrorRecovery(null);
    retryAction.current = null;
  }
}

function getErrorMessage(data: unknown) {
  if (data && typeof data === "object" && "error" in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }

  return "The assessment could not be completed and your narrative has not been submitted. Check the server logs for the specific AI Gateway error (invalid AI_GATEWAY_API_KEY, exhausted quota, or an unrecognized AI_MODEL value) before retrying.";
}

function parseSessionStartResponse(data: unknown) {
  if (!data || typeof data !== "object") return null;

  const payload = data as { session?: unknown; sessionToken?: unknown };
  const parsedSession = caseSessionStateSchema.safeParse(payload.session);
  if (!parsedSession.success || typeof payload.sessionToken !== "string" || !payload.sessionToken.trim()) {
    return null;
  }

  return { session: parsedSession.data, sessionToken: payload.sessionToken };
}
