# V1 Execution Plan — Clearway Structured Intake

## Goal

Turn V0's one-shot classification into a **visible, correctable case state**.
After a claimant submits a narrative, Clearway should show:

- the facts it collected from the narrative;
- the facts it still needs before a confident handoff;
- a proposed, non-binding route; and
- why that route was proposed.

V1 remains a single-turn experience. It makes the system's understanding
legible; V2 will ask the missing questions. The V2 design will use dynamic
decomposition: choose the next permitted action from the observed case state,
rather than run a fixed prompt chain for every claim.

## V0 follow-up applied: state-machine inspiration, not a copied loop

The V0 follow-up identified Udacity's claims-intake loop as useful inspiration
for explicit case state, missing-information tracking, targeted next steps,
and stopping conditions. V1 adopts the **state discipline** now:

```text
claimant narrative → structured extraction → normalized CaseState → visible handoff recommendation
```

This is deliberately not yet a conversational agent loop. The V1 stop
condition is explicit: after one validated analysis, render the complete state
and identify what is missing. Do not ask a follow-up question, call a tool, or
mutate the state again. This creates the reliable state boundary from which V2
can dynamically choose an allowed next action.

Udacity's `03-dynamic-decomposition-solution` was reviewed locally after V1
completion. Its source validates the state-and-tool-loop inspiration, but this
V1 plan remains a product adaptation—not a copied implementation. The
source-grounded V2 mapping is recorded in `planning/v1_v2_handoff_criteria.md`.

## Product boundary

Clearway may extract and organize facts stated by the claimant. It must not
invent a loss date, cause, damage, safety action, injury, policy term, fault,
coverage decision, payment, or settlement outcome.

The route is an intake recommendation, not a coverage or liability decision.

## V1 case-state contract

The application—not the UI—owns a typed `CaseState`.

```ts
type FactStatus = "collected" | "missing" | "unclear" | "not_applicable";

type CaseFact = {
  key:
    | "incident_cause"
    | "damage_description"
    | "affected_property"
    | "loss_timing"
    | "active_loss_or_safety"
    | "injury_or_third_party";
  label: string;
  status: FactStatus;
  value?: string;
  source: "claimant_narrative";
};

type ProposedRoute = {
  kind: "property_adjuster_review" | "liability_review" | "human_triage_review";
  rationale: string;
  confidence: number;
};

type CaseState = {
  claimType: ClaimType;
  summary: string;
  classificationConfidence: number;
  facts: CaseFact[];
  missingFactKeys: CaseFact["key"][];
  proposedRoute: ProposedRoute;
};
```

The exact fact values must remain concise statements grounded in the narrative.
`missingFactKeys` is derived from the fact statuses in application code, so the
model cannot create a contradictory second list.

The V1 state lifecycle is intentionally designed to become V2's loop boundary:

1. **Extract:** model proposes narrative-grounded facts and a proposed route.
2. **Normalize:** application validates fact keys/statuses and derives missing
   facts deterministically.
3. **Present:** claimant sees what Clearway knows and does not know.
4. **Stop (V1):** return the state once. V2 will replace this terminal step
   with targeted clarification only when missing facts matter to routing.

## API contract

Introduce `POST /api/case-analysis` for V1 rather than silently changing the
V0 `/api/intake` response contract.

Input remains:

```json
{ "narrative": "A pipe burst under the kitchen sink overnight..." }
```

Output is a validated `CaseState`. The server is responsible for:

1. validating the narrative;
2. performing one structured AI SDK call through AI Gateway;
3. validating the model's extraction against the V1 schema;
4. deriving missing facts and validating the proposed route; and
5. returning a safe, user-readable failure without provider details.

V0's `/api/intake` remains intact for compatibility until the V1 UI has been
validated. Once V1 is stable, explicitly decide whether to deprecate it or
adapt it as a V1 compatibility wrapper.

## Implementation sequence

Update a step to `[x]` only when every bullet beneath it is complete.

1. [x] **Define the state model**
   - [x] Add V1 Zod schemas and TypeScript types in `lib/claims`.
   - [x] Centralize labels, fact ordering, allowed fact statuses, and route labels.
   - [x] Implement deterministic derivation of `missingFactKeys` from fact statuses.
   - [x] Encode the V1 terminal stop condition: analysis returns one normalized
     `CaseState` and never selects or asks a next question.
   - [x] Write unit tests for invalid, contradictory, and incomplete state.

2. [x] **Build the server-owned analysis path**
   - [x] Add `POST /api/case-analysis` using one AI SDK structured-output call through AI Gateway.
   - [x] Instruct the model to use only stated facts and represent uncertainty as `missing` or `unclear`.
   - [x] Validate model output, then normalize it into `CaseState` on the server.
   - [x] Return safe errors for malformed output and Gateway failure.
   - [x] Preserve the V0 intake route unchanged.

3. [x] **Integrate the structured-intake UI** *(reserved for Vercel v0)*
   - [x] Replace the V0 result panel with a case-state view: claim category, factual summary, collected facts, missing facts, and proposed route.
   - [x] Make fact provenance explicit: all displayed fact values come from the claimant narrative.
   - [x] Explain that missing facts are not assumptions and will be addressed in the next step. Use claimant-facing questions and distinguish `missing` from `unclear` facts.
   - [x] Retain clear loading, validation, malformed-response, and API-error states.
   - [x] Keep the categories panel contextual and responsive beside the narrative on wider screens.

4. [x] **Validate with deterministic tests**
   - [x] Mock each claim category into a complete and an incomplete `CaseState`.
   - [x] Test water damage, fire, storm, theft, liability, ambiguity, and exact gibberish.
   - [x] Test missing facts, unsupported routes, contradictory facts, malformed response bodies, and Gateway failure.
   - [x] Test responsive layout contracts and accessible labels/live regions.
   - [x] Keep live Gateway testing to one or two smoke tests only; model calls are not the test suite. No live model call was used for this test suite; any deployed smoke test belongs to Step 5.

5. [x] **Preview deploy and document V1**
   - [x] Run lint, tests, and production build.
   - [x] Deploy a protected Vercel Preview with the Preview Gateway credential.
   - [x] Smoke-test the deployed page and one live case-analysis request when credits are available.
   - [x] Update the README with the V1 state model, API contract, and V2 seam.

## Deliberate exclusions

- No persistence, claimant account, document upload, policy lookup, or external insurer integration.
- No conversation, targeted clarifying question, tool use, or loop in V1.
- No eve in V1. Eve is evaluated in V2 only if durable orchestration, tools, or
  explicit stop conditions would be simpler and more reliable than an
  application-owned state machine.
- No actual routing action: the route is a visible recommendation only.

## V2 handoff criteria

Start V2 only when V1 can reliably answer:

> What do we know, what do we still need, and what would we do if no more
> information were available?

The concrete V2 entry gate, bounded action set, stop conditions, and required
tests are recorded in `planning/v1_v2_handoff_criteria.md`.

Before implementing V2, review Udacity's `claims_intake_agent_solution`,
especially `loop.py` and `run.py`, and make an explicit adaptation decision for
case-state updates, targeted questions, tool boundaries, and stopping rules.
Use dynamic decomposition rather than a fixed prompt chain: based on validated
state, choose among a targeted clarification, a route recommendation, or human
escalation. Bound the allowed actions and number of turns, keep an auditable
trace, and escalate rather than guess or loop indefinitely. See the ignored
working note `.docs/udacity_dynamic_decomposition.md` for the screenshot-based
design rationale.

## Success criteria

- A single narrative yields a schema-valid, claimant-visible `CaseState`.
- Every displayed fact is either grounded in the narrative or visibly marked
  missing, unclear, or not applicable.
- The proposed route has a concise, non-decisional rationale.
- The application owns the state schema and deterministic normalization; the
  model does not act as the sole product architecture.
- The V1 UI makes the V2 clarification seam obvious without pretending that
  clarification already exists.
