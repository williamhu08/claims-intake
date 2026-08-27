# V1.5 Decision Record — Material Water-Source Ambiguity

> **Planning contract, not a V2 implementation.** This decision defines the
> first supported clarification scenario. V2 must still validate every action
> against the session schema and state before showing it to a claimant.

## Decision

Clearway will support one targeted water-source clarification when the
validated `CaseState` leaves the source of a water loss `missing` or `unclear`
**and** that answer could change the next permitted intake route.

The question matters because the **source of the damage** can change the
appropriate intake-review path: water from the claimant's own plumbing or
appliance may support property-adjuster review, while a possible neighbor,
shared-system, or outside source may require liability review or human triage.
This is only a routing distinction; Clearway does not decide coverage, fault,
or responsibility.

This is not a hard-coded “water claims always get a question” pipeline. The
application exposes the clarification action only for an eligible material
ambiguity; within that bounded action set, the model can choose to ask, propose
a route, or escalate from the validated partial state.

## First supported scenario

A claimant reports water damage but cannot tell whether the water came from
their own pipe or appliance, a shared/outside source, or another party's
property. The distinction is material because it can lead to different
*intake review* paths. It does not determine coverage, fault, or legal
liability.

| Validated information | V2 action/outcome |
| --- | --- |
| Clear first-party source (for example, a burst pipe in the claimant's home), no injury or third-party involvement, and no active safety concern | `propose_route(property_adjuster_review)` and stop with `route_supported`. |
| `incident_cause` is `missing` or `unclear`, and the answer could distinguish first-party property damage from outside/third-party involvement | One `ask_clarifying_question` about the source. |
| Claimant identifies a possible outside, shared, or third-party source | Re-evaluate the full state. Use `liability_review` only when third-party involvement is explicitly claimant-stated; otherwise use `human_triage_review`. Never infer fault. |
| Claimant cannot identify the source, gives no response, or gives information that remains materially ambiguous | `escalate_to_human` with `claimant_cannot_answer` or `unresolved_ambiguity`; do not ask an equivalent question. |
| Active water loss or another safety concern is collected or remains materially unclear | Prioritize human escalation with `safety_review`; do not delay it for the source question. |

## Eligibility rule

The server may offer the source-of-water clarification action only when all of
the following hold:

1. `claimType` is `water_damage` or `other_or_unclear` with a water-loss
   narrative;
2. `incident_cause.status` is `missing` or `unclear`;
3. the session has not already asked a question whose `factKeys` include
   `incident_cause`;
4. fewer than two claimant-facing clarification questions have been asked; and
5. an answer can still change the allowed route or resolve a material
   uncertainty.

The server must not offer this question merely to fill a blank field. In
particular, a clear first-party water source can stop without a clarification,
and an active safety concern escalates without waiting for one.

## Claimant copy

**Question**

> Do you know where the water came from—for example, a pipe or appliance in
> your home, or somewhere outside the property?

**Why this matters**

> This helps us send your intake to the right review team. It does not decide
> coverage, fault, or who is responsible.

**Unable-to-answer path**

> That's okay. We won't guess. We'll send the details you shared to a person
> for review.

## Consequences for V2 tests

- A clear burst pipe must propose the property-adjuster route without asking
  this question.
- An eligible ambiguous water source must produce this question at most once.
- A first-party answer must be re-evaluated before a property route is shown.
- A claimant-stated possible third-party source must never be converted into a
  fault finding; it routes to liability review only when the involvement is
  explicit, otherwise human triage.
- An unable-to-answer, repeated, safety, or still-ambiguous path must end in a
  human escalation with a machine-readable stop reason.
