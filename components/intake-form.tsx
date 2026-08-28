"use client";

import { useRef, useState } from "react";
import {
  caseSessionStateSchema,
  type CaseSessionState,
} from "@/lib/claims/session-schema";
import { exampleClaims } from "@/lib/claims/display";
import { ResultPanel } from "@/components/result-panel";
import { ClarificationInput, isClarificationAnswerValid } from "@/components/clarification-input";

const MIN_LENGTH = 20;
const MAX_LENGTH = 4000;

export function IntakeForm() {
  const [narrative, setNarrative] = useState("");
  const [session, setSession] = useState<CaseSessionState | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [requestState, setRequestState] = useState<"idle" | "submitting" | "active" | "responding" | "terminal" | "error">("idle");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const abortController = useRef<AbortController | null>(null);

  const trimmedLength = narrative.trim().length;
  const tooShort = trimmedLength > 0 && trimmedLength < MIN_LENGTH;
  const loading = requestState === "submitting" || requestState === "responding";
  const pendingAction = session?.pendingAction;
  const answerIsValid = pendingAction
    ? isClarificationAnswerValid(pendingAction.answerType, answer)
    : false;
  const isNoResponse = answer === "no_response";
  const hasActiveSession = Boolean(sessionToken);
  const canSubmit = trimmedLength >= MIN_LENGTH && trimmedLength <= MAX_LENGTH && !loading && !hasActiveSession;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    const submittedNarrative = narrative.trim();
    const version = ++requestVersion.current;
    abortController.current?.abort();
    abortController.current = new AbortController();
    setRequestState("submitting");
    setError(null);
    setSession(null);
    setSessionToken(null);

    try {
      const response = await fetch("/api/case-session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative: submittedNarrative }),
        signal: abortController.current.signal,
      });
      if (version !== requestVersion.current) return;

      let data: unknown;

      try {
        data = await response.json();
      } catch {
        setRequestState("error");
        setError("We received an unreadable response. Please try again.");
        return;
      }

      if (!response.ok) {
        setRequestState("error");
        setError(getErrorMessage(data));
        return;
      }

      const parsed = parseSessionStartResponse(data);
      if (!parsed) {
        setRequestState("error");
        setError("We received an incomplete session response. Please try again.");
        return;
      }

      setSession(parsed.session);
      setSessionToken(parsed.sessionToken);
      setRequestState(parsed.session.terminal ? "terminal" : "active");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (version !== requestVersion.current) return;
      setRequestState("error");
      setError("We couldn't reach the assessment service. Check your connection and try again.");
    }
  }

  async function submitAnswer(value: string) {
    if (!sessionToken || !pendingAction || loading) return;
    setRequestState("responding");
    setError(null);

    try {
      const response = await fetch("/api/case-session/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, answer: value }),
      });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(data));
      const parsed = parseSessionStartResponse(data);
      if (!parsed) throw new Error("We received an incomplete session response. Please try again.");
      setSession(parsed.session);
      setSessionToken(parsed.sessionToken);
      setAnswer("");
      setRequestState(parsed.session.terminal ? "terminal" : "active");
    } catch (error) {
      setRequestState("error");
      setError(error instanceof Error ? error.message : "We couldn't continue this assessment. Please try again.");
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
    setSession(null);
    setSessionToken(null);
    setRequestState("idle");
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        aria-busy={loading}
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
              className="rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          {loading ? "Starting your assessment." : ""}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {loading ? (
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
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {session?.terminal && <ResultPanel result={session.caseState} />}

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
          <p id="clarification-hint" className="mt-2 text-sm text-muted-foreground">
            {pendingAction.answerType === "date"
              ? "Enter a real calendar date as YYYY-MM-DD."
              : pendingAction.answerType === "money"
                ? "Enter a non-negative amount with up to two decimal places."
                : "Answer in your own words."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={!answerIsValid || loading} className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? "Saving…" : "Continue"}
            </button>
            <button type="button" disabled={loading} onClick={() => submitAnswer("no_response")} className="text-sm font-medium text-muted-foreground underline underline-offset-4 disabled:opacity-50">
              I don&apos;t know
            </button>
          </div>
        </form>
      )}
    </div>
  );

  function resetSession() {
    abortController.current?.abort();
    requestVersion.current += 1;
    setNarrative("");
    setSession(null);
    setSessionToken(null);
    setRequestState("idle");
    setAnswer("");
    setError(null);
  }
}

function getErrorMessage(data: unknown) {
  if (data && typeof data === "object" && "error" in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }

  return "We couldn't complete the assessment. Please try again.";
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
