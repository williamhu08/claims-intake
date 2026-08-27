# V1.5 Execution Plan — V2 Design Gate

> **V1.5 is planning and contract work only.** It does not add a claimant-facing
> feature. V2 implementation cannot begin until this plan and
> `v2_handoff_criteria.md` are complete.

## Goal

Convert V1's completed `CaseState` into an approved, buildable V2 contract.
At the end of V1.5, we should be able to explain exactly when Clearway asks a
question, what actions the agent may take, how the session is protected, and
how it stops or escalates.

## Inputs

- V1's deployed and tested `CaseState`.
- `planning/v2_handoff_criteria.md` — product/safety requirements.
- `planning/v1_5_water_source_decision.md` — first material-ambiguity rule
  and claimant copy.
- `planning/v1_5_v2_session_contract.md` — bounded actions, signed-session
  model, safety limits, orchestration choice, and V2 unit-test contract.
- Udacity's reviewed `03-dynamic-decomposition-solution` — inspiration for
  tool-driven control flow, explicit state, traces, and safety budgets.
- `planning/v2_execution_plan.md` — the downstream implementation checklist.

## Execution sequence

Update a step to `[x]` only when every bullet beneath it is complete.

1. [x] **Verify the V1 starting point**
   - [x] Confirm V1 has a validated `CaseState`, deterministic tests, Preview
     smoke test, and documented API contract.
   - [x] Preserve V1 as a terminal one-turn endpoint; do not retrofit a loop.
   - [x] Record the V2/V3 boundaries: V2 clarifies; V3 adds policy, severity,
     evidence-backed handoff, and operational routing.

2. [x] **Choose the first material ambiguity**
   - [x] Record the [water-source decision](./v1_5_water_source_decision.md).
   - [x] Adopt the water-source scenario as V2's first supported clarification
     flow: first-party plumbing/water damage versus possible third-party
     involvement.
   - [x] Define the deterministic trigger: ask only when `incident_cause` is
     missing or unclear **and** resolving the source can change the allowed
     route or escalation.
   - [x] Define the non-trigger: do not ask merely to complete every missing
     fact; clear first-party water damage can stop without a question.
   - [x] Write the single claimant-facing question and its “I don&apos;t know”
     fallback copy.

3. [x] **Freeze the bounded V2 action and stop contract**
   - [x] Approve the only model-selectable actions:
     `ask_clarifying_question`, `propose_route`, and `escalate_to_human`.
   - [x] Define allowed arguments, action-to-state preconditions, and the
     terminal `stopReason` vocabulary.
   - [x] Decide the primary loop control: AI SDK structured tool/action result
     controls normal progress; unexpected provider result is a safe failure.
   - [x] Define config-sourced token/wall-clock safety limits and the separate
     claimant-experience limit of two clarification questions.
   - [x] Define repeated/equivalent-question prevention and the mandatory
     escalation behavior when a claimant cannot answer.

4. [x] **Decide session ownership and claimant experience**
   - [x] Approve the no-database V2 session approach: schema-validated compact
     state plus server signature, returned by the browser on resume.
   - [x] Define what is persisted in session: `CaseState`, question/answer
     history, action trace, pending action, and terminal state.
   - [x] Define signature failure, expired/budget-exhausted session, reset, and
     retry behavior.
   - [x] Specify claimant-facing copy for why a question matters, unresolved
     ambiguity, and human-review escalation.

5. [x] **Choose the orchestration layer and evidence plan**
   - [x] Record direct AI SDK tool calling as the V2 choice and explain why eve
     is deferred: no external tools or durable orchestration yet.
   - [x] Map Udacity's `stop_reason` loop to the AI SDK mechanism without
     copying its Anthropic-specific harness.
   - [x] Define a structured, redactable action trace suitable for tests,
     debugging, and the future V3 handoff.
   - [x] Define the deterministic fixture matrix and acceptance assertions that
     V2 must implement.

6. [x] **Specify the V2 unit-test contract**
   - [x] Identify the pure application modules that V2 must unit test: session
     signature verification, action eligibility, state transitions,
     clarification-history updates, stop-reason selection, and trace
     validation.
   - [x] Require mocked model/tool results for every unit test; a live Gateway
     call is a Preview smoke test, never test-suite evidence.
   - [x] Freeze the minimum fixture matrix: clear first-party water damage,
     ambiguous source resolved by one answer, possible third-party involvement,
     active safety concern, claimant unable to answer, repeated/equivalent
     question, tampered session, invalid action, budget exhaustion, and exact
     gibberish.
   - [x] Require each fixture to assert the visible outcome, terminal
     `stopReason`, bounded action trace, and that no unsupported route or
     ungrounded fact was accepted.
   - [x] Separate route/session unit tests from claimant-flow UI tests so a
     failed interface test cannot conceal an unsafe state transition.

7. [x] **Approve the V2 build handoff**
   - [x] Reconcile all decisions with `v2_handoff_criteria.md` and mark its
     entry criteria complete.
   - [x] Update `vercel-claims-roadmap.md` with only the concise V1.5/V2
     summary; retain detail in the dedicated documents.
   - [x] Review `v2_execution_plan.md` for consistency, then authorize Step 1
     of V2 implementation.

## V1.5 definition of done

- A reviewer can trace every proposed V2 action to a state condition and a
  claimant-visible outcome.
- The first V2 scenario, action vocabulary, stop rules, session model, and
  unit-test contract are explicit enough to implement without redesigning
  during coding.
- The plan clearly states what remains V3 and why V2 will not become an
  unbounded prompt loop or a thin wrapper around a model.
