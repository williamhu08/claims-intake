"use client";

/** Clearway version scope: V2. */

import { useState } from "react";
import { ClarificationInput } from "@/components/clarification-input";
import { isValidClarificationAnswer } from "@/lib/claims/answer-validation";
import { clarificationAnswerTypeValues } from "@/lib/claims/session-schema";
import {
  clarificationAnswerTypeHints,
  clarificationAnswerTypeLabels,
  clarificationAnswerTypeSampleOptions,
} from "@/lib/claims/display";

/**
 * Developer-facing gallery of every ClarificationAnswerType input, rendered
 * outside the real case-session flow. The live claims flow only ever
 * surfaces the handful of answer types a given clarifying question actually
 * needs, so this is the only place all sixteen render together for visual
 * review. Each control keeps its own local state; nothing here is submitted
 * anywhere or tied to a real case session.
 */
export function AnswerTypeShowcase() {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {clarificationAnswerTypeValues.map((answerType) => {
        const value = answers[answerType] ?? "";
        const options = clarificationAnswerTypeSampleOptions[answerType];
        const valid = value.trim().length > 0
          && isValidClarificationAnswer(answerType, value, options);

        return (
          <div key={answerType} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-mono text-sm font-semibold text-foreground">{answerType}</h2>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {clarificationAnswerTypeLabels[answerType]}
              </span>
            </div>
            <ClarificationInput
              answerType={answerType}
              value={value}
              onChange={(next) => setAnswers((prev) => ({ ...prev, [answerType]: next }))}
              options={options}
              describedBy={`answer-type-hint-${answerType}`}
            />
            {clarificationAnswerTypeHints[answerType] ? (
              <p id={`answer-type-hint-${answerType}`} className="mt-2 text-sm text-muted-foreground">
                {clarificationAnswerTypeHints[answerType]}
              </p>
            ) : null}
            <p className="mt-2 text-sm font-medium" aria-live="polite">
              {value.trim().length === 0 ? (
                <span className="text-muted-foreground">No answer yet</span>
              ) : valid ? (
                <span className="text-success">Valid answer</span>
              ) : (
                <span className="text-destructive">Not yet a valid answer</span>
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}
