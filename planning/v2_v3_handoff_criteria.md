# V2 → V3 Handoff Criteria — Narrow Slice

> **V3 is deliberately smaller than the original plan.** It adds one
> deterministic operational handoff for the water-damage flow, not a general
> policy/evidence platform. The broader original scope is preserved locally in
> `.docs/v3_original_handoff_criteria.md`.

## Goal

Turn a terminal V2 water-damage session into one of two outcomes:

1. an adjuster-ready, non-binding property handoff; or
2. a human-review escalation when the available facts or mock policy context
   are insufficient.

V3 changes the question from “what fact should we collect?” to “given the
supported facts, what is the safe next handling step?”

## Fixed V3 input

V3 accepts a schema-valid **terminal V2 session** only. It uses the existing
`CaseState`, claimant provenance, clarification history, and V2 stop reason.
It never accepts raw browser data, re-asks questions, or rewrites V2 facts.

Any V2 human-review terminal, unresolved ambiguity, or claimant-cannot-answer
stop remains human review in V3. At the Step 4 server boundary, invalid or
non-terminal sessions are rejected; a non-water session is either rejected as
outside this narrow slice or returned as a safe human-review outcome. No input
receives a fabricated property handoff.

## One mock policy contract

Use a local, deterministic water-damage fixture. It returns only intake
handling context:

| `policyContextStatus` | V3 behavior |
| --- | --- |
| `route_supported` | Continue to a standard property handoff only when V2 did not end in safety review. |
| `human_review_required` | Escalate to human review. |
| `no_mock_record` | Escalate to human review. |

The fixture has a stable ID and short rationale. It does **not** represent a
real policy, coverage term, eligibility determination, or insurer lookup.

## Deterministic operational urgency

V3 uses only the existing `active_loss_or_safety` fact. Urgency is evaluated
**after** the V2 outcome and mock-policy context determine the disposition; it
does not choose between property-adjuster review and human review.

| Result | Rule |
| --- | --- |
| `urgent` | A V2 `safety_review` terminal and claimant-grounded fact say loss is active or a safety concern exists; produce urgent human review. |
| `standard` | The property-adjuster disposition is supported and a claimant-grounded fact says no active loss or safety concern exists. |
| `human_review` | The fact is missing, unclear, conflicting, or unsupported. |

`urgent` and `human_review` always accompany human-review disposition. Only
`standard` may accompany property-adjuster disposition. This is operational
prioritization, not valuation, coverage, or payment.

## Adjuster-ready handoff

The output is a structured, non-binding handoff containing:

- summary, category, existing proposed route, and classification confidence;
- collected facts with claimant provenance and clarification history;
- V2 stop reason;
- mock-policy fixture ID, version, status, and rationale when a record is
  found—or explicit `no_mock_record` status with null fixture provenance when
  no record is available—clearly labelled as mock;
- urgency and the exact fact that supports it; and
- final disposition: `property_adjuster_review` or `human_review`.

No documents, photos, external evidence, real queue write, or policy number is
added in this slice.

## Implementation boundary

- Use deterministic application code and local fixtures; no additional model
  planning loop is required.
- Continue to use AI SDK/AI Gateway only for V2's existing model work.
- Do not add eve, persistence, authentication, real integrations, document
  ingestion, multi-policy support, or new claimant questions.
- Never state that a claim is covered, denied, paid, valued, accepted, or
  submitted to an insurer.

## Required tests

- water damage + route-supported fixture + no active safety → standard property
  handoff;
- water damage + V2 `safety_review` + active loss/safety → urgent human-review
  handoff;
- missing/unclear safety fact → human review;
- `human_review_required` or `no_mock_record` fixture → human review; and
- invalid/non-terminal/non-water/unresolved V2 input → safe human review or
  rejected handoff, with no fabricated facts.

## V3 entry criteria

- [x] The V2 terminal-session and provenance input are fixed.
- [x] The narrow policy, urgency, handoff, escalation, and test contracts are
  defined above.
- [x] The original broader V3 scope is preserved outside tracked project plans
  for later reconsideration.

V3 implementation may begin only within this narrow slice.
