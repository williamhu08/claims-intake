# V2 Handoff Criteria — Clearway Agentic Intake

## Purpose

V1 is complete: a claimant narrative becomes a validated, visible `CaseState`
with grounded facts, derived missing information, and a non-binding intake
route. V2 may now add a bounded clarification loop.

This document defines the decision gate for starting V2. It prevents Clearway
from adding “agentic” behavior as an unbounded prompt loop or from treating a
model decision as an insurance decision.

## V1 foundation that V2 must preserve

- `CaseState` remains application-owned and schema-validated.
- Each fact remains grounded in `claimant_narrative`, or is explicitly
  `missing`, `unclear`, or `not_applicable`.
- `missingFactKeys` remains derived by application code, not accepted as an
  independent model assertion.
- Existing claim categories and route kinds remain constrained vocabularies.
- Routes remain non-binding intake recommendations: never coverage, fault,
  liability, payment, or settlement decisions.
- The V1 endpoint remains a one-turn terminal analysis; V2 introduces a new
  case-session path rather than silently changing its contract.

## Entry criteria

Start V2 only when all of these are true:

- [x] V1 has a deployed Preview, a validated `CaseState`, deterministic tests,
  and an updated architecture/API README.
- [ ] A specific claimant problem justifies a clarification turn. The first
  candidate is material ambiguity about incident cause, third-party
  involvement, or active safety/loss—not merely any missing field.
- [ ] The product team has written the exact decision rule for when a missing
  fact matters to a route. A question must change the next permitted action or
  reduce a material uncertainty.
- [ ] The allowed V2 action vocabulary, turn budget, repeated-question policy,
  and escalation conditions are agreed before implementation.
- [ ] Claimant-facing copy distinguishes: facts already understood, why one
  question matters, and when Clearway will hand the case to a person.
- [ ] A decision is recorded on whether plain AI SDK tool use is sufficient or
  whether eve materially improves orchestration. Eve is optional, not a
  requirement.

## V2 operating model

V2 uses **dynamic decomposition**, not a fixed prompt chain:

```text
validated CaseState
        |
        v
application checks material uncertainty and turn budget
        |
        +-- route is adequately supported --> present route and stop
        |
        +-- one answer can resolve a material uncertainty --> ask one targeted question
        |                                                |
        |                                                v
        |                                         validate state update
        |                                                |
        |                                                +--> evaluate again
        |
        +-- ambiguity persists, safety needs review, or budget is exhausted
                                                         |
                                                         v
                                                  escalate to a human
```

The application decides what actions are allowed. The model may select only
from that small action set based on validated state:

1. `ask_clarifying_question`
2. `propose_route`
3. `escalate_to_human`

Future evidence or policy lookup tools are V3 concerns. They are not an
implicit V2 addition.

## Required stop conditions

V2 must end the loop when any one of these is true:

- A route is supported by the available facts and no material uncertainty
  remains.
- The claimant cannot provide the material fact, or has already answered the
  equivalent question.
- The maximum clarification-turn budget is reached.
- A safety concern, conflicting account, third-party involvement, weak
  confidence, or unresolved ambiguity requires human review.

Every terminal state must include a machine-readable `stopReason` and a
claimant-facing explanation. The system must escalate rather than guess or
repeat itself.

## Tests required before V2 is complete

- Unit tests for state transitions, allowed actions, stop conditions, and
  repeated-question prevention.
- Deterministic agent-loop fixtures for: clear water damage, ambiguous water
  source, possible third-party involvement, active safety concern, claimant
  unable to answer, and exact gibberish.
- Tests that the application rejects tool/action arguments outside the allowed
  state schema.
- Tests that every trace terminates inside the turn budget.
- Preview smoke tests limited to one or two synthetic cases; model calls do not
  replace the deterministic suite.

## Explicit V2 cuts

- No persistence or authentication unless a real session need forces it.
- No policy lookup, document ingestion, or insurer integration.
- No automated claim decision or actual routing action.
- No open-ended autonomous planning or arbitrary tool access.

## First V2 design decision to make

For the burst-pipe/ambiguous-water-source flow, decide whether the initial
route can safely remain `human_triage_review` until the source is known, or
whether a single targeted source-of-water question changes the recommended
review path enough to justify asking it. Document that choice before coding the
loop.
