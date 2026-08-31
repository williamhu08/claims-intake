# V3 Execution Plan — Narrow Operational Handoff

> **Depends on:** [V2 → V3 Handoff Criteria](./v2_v3_handoff_criteria.md).
> V3 is one deterministic water-damage handoff slice. It is not a general
> policy platform, coverage engine, or new model-agent loop.

## Goal

Given a terminal V2 water-damage session, return either:

- a structured, non-binding **standard** property-adjuster handoff with
  mock-policy context; or
- a human-review handoff when the V2 outcome, policy context, or safety facts
  cannot support the property handoff safely.

## Boundaries

- Reuse V2's signed terminal-session contract and claimant provenance.
- Use local deterministic fixtures and application logic for policy context and
  urgency. Do not add a model call, eve, persistence, or an external service.
- Limit the first slice to `water_damage` and existing route kinds.
- Do not imply coverage, fault, payment, valuation, insurer acceptance, or a
  real queue write.

## Steps

1. [x] **Define the local mock water-policy fixture**
   - [x] Create the small, versioned local demo fixture or fixtures before
     designing the data model: each must state its stable ID, matching rules,
     `route_supported` / `human_review_required` / `no_mock_record` outcome,
     and claimant-safe rationale in the
     [mock water-policy fixture](./v3_mock_water_policy.md).
   - [x] Specify which verified terminal V2 facts may be used to match a
     fixture, and explicitly route a non-match to `no_mock_record` rather
     than inventing a result.
   - [x] Label every result as mock handling context—not a real policy,
     coverage term, eligibility decision, or insurer lookup.

2. [x] **Add schemas for the agreed fixture and handoff contract**
   - [x] Add schemas/types for mock-policy context, urgency, evidence
     references, final disposition, and the adjuster-ready handoff.
   - [x] Require the handoff contract to contain a terminal V2 state; token
     verification and rejection of invalid/non-terminal input belong to the
     Step 4 server boundary.
   - [x] Keep mock fixture provenance separate from claimant fact provenance.
   - [x] Add focused schema tests for valid fixture/handoff shapes and
     impossible fixture-provenance or urgent-property combinations.

3. [x] **Implement deterministic V3 decisions**
   - [x] Implement the local fixture lookup exactly as defined in Step 1.
   - [x] Derive `urgent`, `standard`, or `human_review` from the terminal V2
     disposition and existing `active_loss_or_safety` fact.
   - [x] Apply the handoff precedence in the handoff criteria: human-review
     conditions override a property-adjuster handoff; only `standard` may
     accompany property-adjuster disposition.
   - [x] Produce a structured, non-binding handoff with fact/fixture evidence
     references and a claimant-safe rationale.

4. [x] **Expose a small server boundary**
   - [x] Add one Node.js route that receives the V2 session token, verifies it
     server-side, and returns the schema-validated handoff.
   - [x] Reject invalid, non-terminal, and non-water sessions; preserve
     unresolved or claimant-cannot-answer V2 outcomes as safe human review.
   - [x] Never expose a signing secret, decode session contents in the browser,
     or accept client-reconstructed case state.
   - [x] Return safe, claimant-readable failures without tool internals,
     fixture implementation details, or stack traces.

5. [x] **Validate deterministically**
   - [x] Unit-test fixture lookup, urgency derivation, precedence, handoff
     validation, and token/session eligibility.
   - [x] Route-test the request-boundary cases in the coverage matrix below.
   - [x] Run lint, all tests, and the Webpack production build.

### Route-level coverage matrix

| Case | Session condition | Expected HTTP result | Expected outcome |
| --- | --- | --- | --- |
| Standard property handoff | Signed terminal water session; `Resolved:` safety fact; supported property route | `200` | Standard property-adjuster handoff |
| Urgent safety review | Signed terminal water session; `Active:` safety fact; `safety_review` stop | `200` | Urgent human review |
| Missing safety fact | Signed terminal water session; safety fact is missing | `200` | Human review; never a standard property handoff |
| Fixture-required review | Signed terminal water session outside the supported property route | `200` | Human review with `human_review_required` mock context |
| No mock record | Signed terminal water session; server-selected fixture registry has no matching record | `200` | Human review with no fixture provenance |
| Invalid or expired token | Missing, tampered, or expired signed token | `400` or `409` | Safe claimant-readable rejection |
| Invalid V2 input | Signed but non-terminal or non-water session | `422` | Safe claimant-readable ineligibility rejection |

The production route uses its fixed source-controlled fixture registry and
deliberately provides no client mechanism for selecting a fixture set. Its
server-only handler factory makes the `no_mock_record` behavior testable while
keeping malformed or duplicate fixture configurations at the pure engine
boundary.

6. [x] **Present and verify the final handoff** *(completed in Vercel v0)*
   - [x] After a terminal V2 session, request and render the V3 handoff without
     replacing the claimant-visible V2 facts or history.
   - [x] Make mock policy context clearly labelled as demo context; make human
     review and urgency understandable without coverage language.
   - [x] Add focused mocked UI tests for standard, urgent, and human-review
     handoff outcomes.
   - [x] Perform a protected Preview review of the terminal V2 → V3 handoff.
   - [x] Confirm that V3 introduces no new model invocation.

## Definition of done

- Every eligible water-damage V2 terminal receives exactly one schema-valid
  handoff or safe human-review result.
- Every handoff cites only claimant-grounded facts and clearly labelled mock
  fixture context.
- V3 makes no coverage, payment, valuation, fault, or real-operational claim.
- The implementation is deterministic enough that replacing the model would
  not change V3's policy, urgency, or handoff decision logic.
