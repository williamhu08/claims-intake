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

1. [ ] **Close the V1.5 decisions in code-level terms**
   - [ ] Add a concise decision record for the ambiguous-water-source rule.
   - [ ] Define the V2 action, stop-reason, clarification-history, and signed
     session Zod schemas.
   - [ ] Add configuration names for session signing, token/wall-clock budget,
     and clarification limit; document required Preview environment variables.
   - [ ] Confirm direct AI SDK tool calling remains sufficient; record why eve
     is deferred.

2. [ ] **Build the server-owned session engine**
   - [ ] Add `POST /api/case-session/start` to create V1-grounded initial state
     and return one validated V2 action.
   - [ ] Add `POST /api/case-session/respond` to validate a signed session and
     claimant answer, update facts, and return the next action or terminal
     state.
   - [ ] Define AI SDK tools for `ask_clarifying_question`, `propose_route`,
     and `escalate_to_human`; validate all inputs and never execute an external
     operational action.
   - [ ] Return safe failures for malformed model action, invalid/tampered
     session, budget exhaustion, and Gateway failure.
   - [ ] Keep `/api/case-analysis` unchanged.

3. [ ] **Integrate the V2 claimant flow** *(reserved for v0)*
   - [ ] Start a V2 session from the claimant narrative rather than treating a
     V1 result as final.
   - [ ] Present one targeted, material question with an optional “I don&apos;t
     know” path.
   - [ ] Show the refreshed `CaseState`, question history, terminal route, or
     human-review escalation clearly.
   - [ ] Explain why the question matters without implying coverage or fault.
   - [ ] Preserve accessible loading, error, retry, and reset states.

4. [ ] **Validate the bounded loop deterministically**
   - [ ] Mock the AI SDK tools/actions; no live model calls in the test suite.
   - [ ] Test clear water damage → property route → terminal stop.
   - [ ] Test ambiguous water source → one question → resolved property route.
   - [ ] Test no response, repeat question attempt, safety concern, unresolved
     ambiguity, invalid action, invalid signature, and exact gibberish → safe
     escalation.
   - [ ] Assert every fixture reaches a terminal state in the allowed budget
     with an auditable action trace.
   - [ ] Test claimant-facing question/history/escalation UI and responsive,
     accessible states.

5. [ ] **Preview V2 and document the seam to V3**
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
