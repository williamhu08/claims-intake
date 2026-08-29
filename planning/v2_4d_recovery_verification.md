# V2 4D — Recovery, Reset, and Verification Design

## Purpose

4D makes the claimant-facing V2 flow resilient and trustworthy after the core
session loop works. It covers recoverable failures, safe reset behavior,
responsive presentation, accessibility, and verification of the complete UI
contract. It must not expand V2 into persistence, authentication, policy
lookup, evidence ingestion, or actual claims operations.

## 1. Failure taxonomy and recovery

### Retry in place

Retry in place when the pending request may have failed before the server
accepted it:

- transient network failure;
- timeout;
- retryable Gateway failure; or
- temporary server availability failure.

The UI should preserve the narrative, current Case State, pending question or
answer, and the claimant's entered value. The retry must submit the same
request, not create a new question or reconstruct session state in the browser.
Show a specific retry action and prevent duplicate requests while retrying.

### Reset directly

Do not retry when the server rejects the session as invalid or expired, when a
signature fails, when the response is malformed, or when the session has
already become terminal. These states cannot be repaired by resubmitting the
same token. Explain that the session can no longer continue and provide a
clear reset path requiring a fresh narrative.

### Safe failure copy

Do not expose signed payloads, model errors, provider stop reasons, stack
traces, or internal tool arguments. Claimant-facing copy should say what
happened, whether the current session can be retried, and what action is
available next.

## 2. Reset semantics

Reset must clear all active-session state together:

- opaque session token;
- current session snapshot;
- pending question and answer value;
- clarification history shown in the UI;
- terminal result;
- loading and error state; and
- any retry metadata.

After reset, the form must require a new narrative submission. Never reuse a
terminal, invalid, or expired token, and never silently edit the narrative
inside an existing session. The reset action should be keyboard accessible and
should return focus to the narrative control or another clearly identified
start point.

## 3. Duplicate submissions and race conditions

The primary submit and clarification submit controls must be disabled while a
request is pending. A second click, Enter keypress, or repeated browser event
must not create another server request. Preserve the current UI until the
validated response is accepted; do not clear a question or replace the token
optimistically.

A response is accepted only when both the session snapshot and refreshed
opaque token pass the client response schema. If validation fails, discard
both rather than retaining a partial state or token.

## 4. Responsive and visual verification

Verify the full document at narrow, medium, and wide viewports:

- narrative card remains usable without horizontal scrolling;
- question card remains readable and does not overflow;
- Case State preserves its hierarchy and remains discoverable;
- collected and still-needed facts do not become cramped or overlap;
- terminal outcomes remain below the final Case State rather than replacing it;
- long summaries, questions, answers, and error copy wrap safely; and
- controls remain reachable at keyboard and mobile widths.

The supported-category section and Case State disclosure should retain their
contextual placement without competing with the active question or final
handoff. Responsive checks should include both Testing mode and live-mode
loading/error states.

## 5. Accessibility contract

Use semantic headings in document order and labels associated with every
control. Status changes should use `aria-live`; use `role="alert"` only for
errors requiring claimant action. The active question should have a clear
accessible name, and its answer control should expose the server-declared
format without relying on visual styling alone.

Verify keyboard-only operation for examples, disclosures, narrative editing,
question answers, “I don’t know,” retry, reset, and terminal actions. Focus
must remain visible, disabled controls must be announced appropriately, and
color must not be the only signal for status, provenance, or errors.

## 6. Focused component and interaction tests

Use mocked V2 route responses and assert claimant-visible behavior for:

1. immediate proposed route;
2. one clarification followed by a proposed route;
3. “I don’t know” followed by human review;
4. retry after a transient network or Gateway failure;
5. invalid or expired session routed directly to reset;
6. malformed response with no partial state or token retained;
7. reset after an active question;
8. reset after a terminal result;
9. duplicate submit prevention; and
10. long and multiline narrative/question/answer content.

Each test should assert the visible Case State, question/history behavior,
button state, error copy, and whether the next action is retry or reset.

## 7. Answer-type fixtures

The dynamic answer contract must be tested end to end. At minimum, include:

- free-text: valid, empty, too short, and maximum-length values;
- monetary/currency: valid non-negative decimals, too many fractional digits,
  malformed characters, and paste behavior; and
- date: valid `YYYY-MM-DD`, impossible calendar dates, malformed values, and
  paste behavior.

The UI must use the server-declared answer type and must not infer a dropdown
from question wording. Options are permitted only when the server declares a
choice format and supplies the options.

## 8. Browser smoke verification

After component tests pass, run a small browser smoke matrix against the
Preview:

- initial narrative entry and submission;
- one complete Testing mode clarification flow;
- retry and reset interaction;
- terminal Final Case State plus outcome section; and
- at least one narrow viewport check.

Browser checks complement deterministic tests; they do not replace them or
justify extra live Gateway calls. Record only non-sensitive run metadata and
never capture session tokens in screenshots, URLs, logs, or test artifacts.

## Definition of done for 4D

4D is complete when every retryable failure preserves the claimant's work and
can retry safely, every invalid session reaches a fresh-start reset path, the
complete flow is usable responsively and by keyboard, and the focused mocked
interaction suite covers recovery, reset, malformed responses, answer formats,
and duplicate-submit prevention. The implementation remains within V2's
non-binding, server-owned session boundary.
