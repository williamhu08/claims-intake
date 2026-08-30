# V3 Mock Water-Policy Fixture

> **Demo handling context only.** This is a local, deterministic fixture for
> Clearway's V3 water-damage handoff. It is not an insurance policy, a coverage
> term, an eligibility determination, or an insurer integration.

## Purpose

V2 has already collected and validated a terminal intake session. V3 needs one
small, reproducible source of **mock handling context** before it produces an
adjuster-ready handoff. The fixture answers only whether this demo flow can
continue to a property-adjuster handoff or must remain with human review.

It does not decide whether a claim is covered, who is at fault, what it is
worth, or whether it will be paid.

## Fixture registry

The initial registry has two versioned local records. Step 2 validates their
shape; Step 3 represents and evaluates them in code. This document is their
source contract.

| Fixture ID | Match | `policyContextStatus` | Claimant-safe rationale |
| --- | --- | --- | --- |
| `clearway-demo-water-property-adjuster-v1` | Verified terminal V2 `water_damage` session whose terminal action is `propose_route`, terminal `stopReason` is `route_supported`, and proposed route is `property_adjuster_review`. | `route_supported` | “Demo handling context supports property-adjuster review based on the intake details provided.” |
| `clearway-demo-water-human-review-v1` | Verified terminal V2 `water_damage` session that does not have the property-adjuster terminal route above, including an existing human-review terminal or another proposed route. | `human_review_required` | “Demo handling context requires a person to review the intake details.” |

The matching rule uses only validated, structured V2 fields. It must never
interpret free-text fact values, infer third-party involvement, or inspect the
claimant narrative again.

## Required V2 input and matching order

The server evaluates the signed V2 session in this order:

1. Verify the session token, schema, expiry, and terminal state. Reject an
   invalid or non-terminal session; it is not eligible for fixture lookup.
2. Require `claimType === "water_damage"`. A non-water claim is outside this
   V3 slice and receives a safe human-review outcome or a rejected handoff,
   according to the API contract.
3. If the terminal outcome is the supported property-adjuster route, select
   `clearway-demo-water-property-adjuster-v1`.
4. Otherwise, select `clearway-demo-water-human-review-v1`.
5. If the expected fixture is absent, malformed, disabled, or has an unknown
   version, return `no_mock_record` and human review. Never substitute another
   fixture or fabricate a context.

The V3 urgency rule is deliberately separate from fixture selection. It uses
only the claimant-grounded `active_loss_or_safety` fact **after** the V2 outcome
and fixture context establish disposition. An active loss or safety concern is
an urgent human-review handoff; it never turns a property-adjuster handoff into
an urgent route. Urgency cannot turn mock context into a coverage or payment
decision.

Urgency is **not** inferred from the apparent amount of damage, emotionally
urgent language, an estimated dollar value, or an unverified severity label.
Those signals would require additional, explicit rules and are outside this
narrow V3 contract. If the claimant does not clearly state whether loss remains
active or whether a safety concern exists, return `human_review` rather than
guessing an urgency level.

## Fixture shape implemented in Step 3

The fixture registry contains records equivalent to this shape:

```ts
{
  id: "clearway-demo-water-property-adjuster-v1",
  version: 1,
  claimType: "water_damage",
  match: {
    kind: "property_adjuster_route",
    terminalKind: "propose_route",
    stopReason: "route_supported",
    proposedRoute: "property_adjuster_review",
  },
  policyContextStatus: "route_supported",
  rationale: "Demo handling context supports property-adjuster review based on the intake details provided.",
}
```

The human-review record has the same immutable identifying fields and a
structured fallback match for any other verified terminal water-damage outcome.
The implementation must keep fixture provenance (`fixtureId`, `version`,
`policyContextStatus`) separate from all claimant facts and claimant-provided
provenance.

## Boundaries and acceptance checks

- The fixture is local application data, versioned in source control, and
  contains no real policy number or claimant information.
- Only the server reads it; the browser may receive its safe ID, status, and
  rationale in the final handoff, labelled as demo context.
- `route_supported` is an intake-handling result only. It never says that the
  claim is covered, approved, accepted, or payable.
- A fixture match cannot override V2 safety, unresolved-ambiguity, or
  claimant-cannot-answer outcomes; those remain human review.
- A V2 `safety_review` outcome with an `Active:` safety fact is always an
  urgent human-review handoff, even if a property-adjuster fixture would
  otherwise match.
- Tests must cover both records and the defensive `no_mock_record` result.

## Decision

V3 begins with these two mock water-policy records because water damage is the
only category with a previously defined material-ambiguity and clarification
flow. Other categories continue through V1/V2 intake and terminate safely in
human review until category-specific handling contracts are designed.
