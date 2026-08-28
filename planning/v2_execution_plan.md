# V2 Execution Plan — Clearway Agentic Intake

> **Depends on V1.5.** [V1.5 — V2 Handoff Criteria](./v2_handoff_criteria.md)
> defines the product and safety contract. This document is the implementation
> checklist for delivering it.

## V2 goal

Turn V1's visible, one-turn `CaseState` into a bounded claimant interaction:

```text
narrative → CaseState → choose one permitted next action
          → targeted question (only if material) → updated CaseState → route or escalate → stop
```

## Why V2 is not V1 with another prompt

V1 is a fixed, one-turn pipeline: one claimant narrative enters
`/api/case-analysis`, the model returns a `CaseState`, and the flow ends. It
cannot inspect a partial state and decide whether it should ask a new question.

V2 is bounded **dynamic decomposition**. `/api/case-session/start` creates a
validated initial state, and `/api/case-session/respond` resumes only from a
server-signed state after a real claimant answer. On each server turn, the
model can select one application-constrained action—ask, propose a non-binding
route, or escalate—based on the current partial state. The application owns
eligibility, provenance, stop conditions, and safety budgets; the model does
not invent a next step or get arbitrary tool access.

The first supported ambiguity is water source:

- A burst pipe or clear first-party water loss can stop with a proposed property
  adjuster route.
- A water-loss account whose source could be the claimant's property or a
  third party receives one targeted source-of-water question.
- A claimant who cannot answer, an unresolved material ambiguity, or a safety
  concern receives a human-triage escalation rather than a guess.

## Scope and boundaries

- Preserve V1's `CaseState`, categories, fact provenance, and non-binding
  routes.
- Use AI SDK tool calling through AI Gateway. **Do not use eve in V2**: the
  action set is intentionally small, session state is application-owned, and
  no external tools are introduced. Re-evaluate eve only when V3 adds policy
  or evidence tools.
- Do not add policy lookup, severity, real queue writes, documents,
  authentication, or a database. They are V3 or later.
- The existing `/api/case-analysis` remains V1's terminal one-turn endpoint.
  V2 adds a separate case-session contract.

## V1.5 implementation constraints

Every remaining V2 step implements the approved V1.5 contract; it must not
quietly redesign it. In particular:

- Preserve the three-action boundary: ask one targeted clarification, propose
  a non-binding route, or escalate to a human.
- Apply the water-source materiality/eligibility rule before a model can ask
  that first clarification; never turn missing facts into a generic form.
- Preserve server-owned, signed session state; prior state, action history, or
  terminal outcomes from the browser are untrusted until verified.
- Preserve the terminal `stopReason` vocabulary, token/wall-clock safety
  budget, two-question claimant-experience limit, and no-repeat rule.
- Preserve claimant provenance: original facts use `claimant_narrative`; facts
  learned in a clarification use `claimant_response`.
- Keep V3 work out of V2: no policy lookup, severity, evidence ingestion,
  actual queue writes, or coverage/fault/payment decisions.
- Meet V1.5's deterministic unit-test contract with mocked model/tool results;
  Preview model calls are smoke checks only.

## Session and action contract

The server owns the canonical schemas and signs the compact session state that
the browser returns on each claimant response. There is no database in V2.

```ts
type CaseSessionState = {
  caseState: CaseState;
  clarificationHistory: Array<{
    factKeys: CaseFactKey[];
    question: string;
    answer?: string | "no_response";
  }>;
  pendingAction?: {
    kind: "ask_clarifying_question";
    question: string;
    factKeys: CaseFactKey[];
  };
  terminal?: {
    kind: "propose_route" | "escalate_to_human";
    stopReason:
      | "route_supported"
      | "unresolved_ambiguity"
      | "claimant_cannot_answer"
      | "safety_review"
      | "safety_budget_exhausted";
    rationale: string;
  };
};
```

The model may choose exactly one schema-validated action per server turn:

1. `ask_clarifying_question` — one concise question tied to one or more
   material `missing`/`unclear` fact keys;
2. `propose_route` — terminal only when the available state supports it; or
3. `escalate_to_human` — terminal for unresolved ambiguity, safety review, or
   inability to answer.

The UI pauses after a question and submits a claimant answer in a later HTTP
request. This is deliberately different from Udacity's fixture harness, where
a clarification tool immediately returns a scripted answer inside the same
loop.

## Safety and stop policy

- Tool-call/terminal semantics are the primary workflow control. The model is
  not allowed to invent an action outside the schema.
- A config-sourced token/wall-clock safety budget protects the server
  interaction; it is not the normal reason to finish a case.
- At most two clarification questions may be presented in a session. This is a
  claimant-experience constraint, not the model's primary stop signal.
- The application rejects repeat/equivalent fact-key questions and escalates
  instead.
- The browser cannot alter a prior session state or action history without
  invalidating its server signature.

## Implementation sequence

Update a step to `[x]` only when every bullet beneath it is complete.

1. [x] **Close the V1.5 decisions in code-level terms**
   - [x] Add a concise decision record for the ambiguous-water-source rule.
   - [x] Define the V2 action, stop-reason, clarification-history, and signed
     session Zod schemas.
   - [x] Add configuration names for session signing, token/wall-clock budget,
     and clarification limit; document required Preview environment variables.
   - [x] Confirm direct AI SDK tool calling remains sufficient; record why eve
     is deferred.

2. [x] **Build the server-owned session engine**
   - [x] Implement the V1.5 action/session contract without expanding its
     action vocabulary or stop conditions.
   - [x] Add `POST /api/case-session/start` to create V1-grounded initial state
     and return one validated V2 action.
   - [x] Add `POST /api/case-session/respond` to validate a signed session and
     claimant answer, update facts, and return the next action or terminal
     state.
   - [x] Define AI SDK tools for `ask_clarifying_question`, `propose_route`,
     and `escalate_to_human`; validate all inputs and never execute an external
     operational action.
   - [x] Return safe failures for malformed model action, invalid/tampered
     session, budget exhaustion, and Gateway failure.
   - [x] Keep `/api/case-analysis` unchanged.
   - [x] Preserve fact provenance when a clarification adds information:
     V1-origin facts remain `claimant_narrative`; newly learned facts are
     `claimant_response`.

3. [x] **Validate the server-owned loop deterministically**
   - [x] Implement V1.5's fixture matrix and assert its action/stop/provenance
     invariants before adding any live smoke check.
   - [x] Mock the AI SDK tools/actions; no live model calls in the test suite.
   - [x] Add focused unit tests for session signing, action eligibility,
     state-transition functions, clarification-history updates, stop-reason
     selection, and action-trace validation before route-level tests.
   - [x] Test clear water damage → property route → terminal stop.
   - [x] Test ambiguous water source → one question → resolved property route.
   - [x] Test no response, repeat question attempt, safety concern, unresolved
     ambiguity, invalid action, invalid signature, and exact gibberish → safe
     escalation.
   - [x] Assert every fixture reaches a terminal state in the allowed budget
     with an auditable action trace.

4. [ ] **Integrate the V2 claimant flow** *(reserved for Vercel v0)*
   Break this work into the following independently implementable parts:

   **4A.** [ ] **Start a V2 claimant session**
   - [ ] Replace the one-turn V1 submission flow with the V2 lifecycle:
     narrative → session start → optional question → claimant response →
     refreshed state → terminal route or human review.
   - [x] Start V2 from the claimant narrative by calling
     `POST /api/case-session/start`; do not treat the V1 `CaseState` as final
     or call `/api/case-analysis` from the claimant UI.
   - [ ] Implement the start request as a client-side state transition with
     explicit `idle`, `submitting`, `active`, `terminal`, and `error` states;
     disable the submit control during `submitting` and prevent duplicate
     session-start requests.
   - [x] Send exactly `{ narrative }` in the request body after trimming the
     value, while preserving the existing 20–4000 character validation and
     showing validation feedback before any network request.
   - [x] Validate the complete response shape before committing UI state:
     require both a valid `session` snapshot and a non-empty `sessionToken`;
     if either is missing or malformed, discard the response and show the
     malformed-response error without retaining a partial token.
   - [x] Branch from the server-declared initial snapshot: hand a pending
     question to 4B, and hand an immediate route, human-review result, or
     other terminal stop to 4C. The UI must not assume that session start
     always produces a question.
   - [x] Preserve the `sessionToken` returned by `/api/case-session/start` as
     an opaque client value; never let the browser edit or reconstruct
     canonical session state.
   - [x] Once a session starts, make the submitted narrative read-only so the
     claimant&apos;s active session remains tied to the exact text that was
     analyzed. Provide an explicit “Edit narrative” / “Start over” action,
     which clears the current session, token, question history, and results;
     the edited narrative must begin a new session rather than modifying the
     existing one.
   - [ ] Preserve accessible narrative validation, loading, malformed-response,
     API-error, retry, and reset states.

   **4B.** [ ] **Ask and answer one clarification**
   - [ ] Render exactly one pending clarification question at a time, tied to
     the material fact key(s) returned by the server. Do not generate or
     rephrase questions in the browser.
   - [ ] Treat the server response as the source of truth for the answer type.
     The pending action must declare whether the claimant should provide free
     text, a monetary amount, or a calendar date; the UI must not infer the
     type from the question wording.
   <!--- AI-added clarification: Monetary and date answers are a good example of
   how using AI helped surface additional product details that needed deliberate
   thought. This step was added to make those dynamic answer formats and their
   input restrictions explicit. --->
   - [ ] For monetary answers, render a dedicated input that accepts only a
     non-negative decimal amount with at most two digits after the decimal
     point (for example, `2100.35`). Reject a second decimal point, extra
     fractional digits, signs, letters, whitespace, and malformed insertion
     patterns such as `.200.35`, `200.35.`, or `20.0.35` before submission.
   - [ ] For date answers, render a dedicated `YYYY-MM-DD` input. Accept only
     numeric characters while editing, guide the claimant with the required
     format, validate that the completed value is a real calendar date, and
     submit only the canonical format.
   - [ ] For free-text answers, use a labelled text input or textarea with the
     server&apos;s length constraints and preserve the optional “I don&apos;t know” path.
   - [ ] Keep format restrictions usable for keyboard, paste, deletion, and
     mobile input; do not rely on `input type="number"` for currency and do
     not rely on browser locale-dependent date controls when the contract
     requires `YYYY-MM-DD`.
   - [ ] Explain why the answer matters for routing, without implying coverage,
     fault, liability, payment, or a final insurance decision.
   - [ ] Provide an optional “I don&apos;t know” / “I&apos;m not sure” action that
     submits the contract&apos;s `no_response` answer rather than inventing a value.
   - [ ] Submit ordinary answers to `POST /api/case-session/respond` with the
     opaque session token and answer; disable duplicate submission while the
     request is pending and preserve the question until accepted.
   - [ ] Show compact question history with prior questions and claimant
     answers, including an explicit unable-to-answer entry when applicable.
     Never expose internal prompts, tool arguments, or signed session contents.

   **4C.** [ ] **Render progress and terminal outcomes**
   - [ ] Render the refreshed `CaseState` after each accepted response,
     including updated facts, provenance (`claimant_narrative` versus
     `claimant_response`), missing facts, and classification confidence.
   - [ ] Render terminal outcomes distinctly: a non-binding proposed route with
     rationale, or a human-review escalation with a calm explanation. Both
     must make clear that the system has not determined coverage or fault.
   - [ ] Handle server-declared stop reasons in claimant language, including
     resolved routing, unresolved ambiguity, inability to answer, safety
     review, and safety-budget exhaustion; do not expose raw error details.
   - [ ] Preserve the refreshed `sessionToken` returned by
     `/api/case-session/respond` as an opaque value for the next response.

   **4D.** [ ] **Recover, reset, and verify the claimant flow**
   - [ ] Treat retryable Gateway/network failures as retry-in-place by
     resubmitting the same pending question or answer; treat invalid or
     expired sessions as non-retryable and route directly to reset.
   - [ ] Reset safely by clearing local view state and requiring a fresh
     narrative submission; never reuse a terminal, invalid, or expired token.
   - [ ] Keep supported-category guidance contextual and ensure the form,
     question panel, history, and terminal result remain responsive at narrow
     and wide viewports.
   - [ ] Use semantic headings, labelled controls, `aria-live` for status
     updates, and `role="alert"` for actionable errors.
   - [ ] Add focused claimant-flow component/interaction tests with mocked V2
     routes covering immediate route, one clarification, “I don&apos;t know”,
     retry after failure, malformed response, human review, reset, and
     duplicate-submit prevention.
   - [ ] Add answer-type fixtures and tests for free text, valid/invalid
     monetary input, and valid/invalid `YYYY-MM-DD` input, including paste and
     malformed-character rejection. Before frontend implementation, align the
     V2 action schema and route tests with the answer-type field so the dynamic
     contract is explicit and schema-validated end to end.

5. [ ] **Verify V2 end-to-end and document the seam to V3**
   - [ ] Confirm the shipped V2 behavior still matches the V1.5 action,
     session, safety, provenance, and V3-boundary decisions.
   - [ ] Test claimant-facing question/history/escalation UI and responsive,
     accessible states separately from the server/session unit suite.
   - [ ] Run lint, tests, and production build.
   - [ ] Deploy a protected Preview only.
   - [ ] Make no more than two synthetic live Gateway smoke calls, recording
     each in ignored `.runs/` metadata.
   - [ ] Update README architecture with the V2 session/action boundary and
     the preliminary V3 dependency contract.

## Definition of done

- A claimant receives a question only when it can reduce a material routing
  ambiguity.
- Every next action is constrained, schema-validated, traceable, and either
  advances the session or terminates it safely.
- The session never repeats a question, guesses a missing fact, makes an
  insurance decision, or loops indefinitely.
- V2 ends in a non-binding route recommendation or human-review escalation,
  ready for V3 to add mock policy/evidence/severity context.
