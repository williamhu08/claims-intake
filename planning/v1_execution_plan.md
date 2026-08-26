# V1 Execution Plan — Clearway Structured Intake

## Goal

Turn V0's one-shot classification into a **visible, correctable case state**.
After a claimant submits a narrative, Clearway should show:

- the facts it collected from the narrative;
- the facts it still needs before a confident handoff;
- a proposed, non-binding route; and
- why that route was proposed.

V1 remains a single-turn experience. It makes the system's understanding
legible; V2 will ask the missing questions.

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

1. [ ] **Define the state model**
   - [ ] Add V1 Zod schemas and TypeScript types in `lib/claims`.
   - [ ] Centralize labels, fact ordering, allowed fact statuses, and route labels.
   - [ ] Implement deterministic derivation of `missingFactKeys` from fact statuses.
   - [ ] Write unit tests for invalid, contradictory, and incomplete state.

2. [ ] **Build the server-owned analysis path**
   - [ ] Add `POST /api/case-analysis` using one AI SDK structured-output call through AI Gateway.
   - [ ] Instruct the model to use only stated facts and represent uncertainty as `missing` or `unclear`.
   - [ ] Validate model output, then normalize it into `CaseState` on the server.
   - [ ] Return safe errors for malformed output and Gateway failure.
   - [ ] Preserve the V0 intake route unchanged.

3. [ ] **Integrate the structured-intake UI** *(reserved for v0)*
   - [ ] Replace the V0 result panel with a case-state view: claim category, factual summary, collected facts, missing facts, and proposed route.
   - [ ] Make fact provenance explicit: all displayed fact values come from the claimant narrative.
   - [ ] Explain that missing facts are not assumptions and will be addressed in the next step.
   - [ ] Retain clear loading, validation, malformed-response, and API-error states.
   - [ ] Keep the categories panel contextual and responsive beside the narrative on wider screens.

4. [ ] **Validate with deterministic tests**
   - [ ] Mock each claim category into a complete and an incomplete `CaseState`.
   - [ ] Test water damage, fire, storm, theft, liability, ambiguity, and exact gibberish.
   - [ ] Test missing facts, unsupported routes, contradictory facts, malformed response bodies, and Gateway failure.
   - [ ] Test responsive layout contracts and accessible labels/live regions.
   - [ ] Keep live Gateway testing to one or two smoke tests only; model calls are not the test suite.

5. [ ] **Preview deploy and document V1**
   - [ ] Run lint, tests, and production build.
   - [ ] Deploy a protected Vercel Preview with the Preview Gateway credential.
   - [ ] Smoke-test the deployed page and one live case-analysis request when credits are available.
   - [ ] Update the README with the V1 state model, API contract, and V2 seam.

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

Before implementing V2, review Udacity's `claims_intake_agent_solution`,
especially `loop.py` and `run.py`, and make an explicit adaptation decision for
case-state updates, targeted questions, tool boundaries, and stopping rules.

## Success criteria

- A single narrative yields a schema-valid, claimant-visible `CaseState`.
- Every displayed fact is either grounded in the narrative or visibly marked
  missing, unclear, or not applicable.
- The proposed route has a concise, non-decisional rationale.
- The application owns the state schema and deterministic normalization; the
  model does not act as the sole product architecture.
- The V1 UI makes the V2 clarification seam obvious without pretending that
  clarification already exists.
