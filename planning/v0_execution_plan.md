# V0 Execution Plan - Clearway

## Goal

Ship a deployed, demo-ready property-claims intake slice. A claimant enters a plain-language account of an incident and receives a structured initial assessment:

- `claimType`
- `summary`
- `confidence`

This is triage only. It must not determine coverage, liability, payment, or fault.

## V0 product contract

### Input

`POST /api/intake`

```json
{ "narrative": "A pipe burst under the kitchen sink overnight..." }
```

Validate a trimmed narrative between 20 and 4,000 characters.

### Output

```json
{
  "claimType": "water_damage",
  "summary": "The claimant reported...",
  "confidence": 0.91
}
```

`claimType` is one of:

- `water_damage`
- `fire_or_smoke`
- `weather_or_storm`
- `theft_or_vandalism`
- `liability`
- `other_or_unclear`

`summary` is concise and factual, based only on supplied text. `confidence` is a number from `0` to `1`.

## Implementation sequence

Update a step to `[x]` only when every bullet beneath it is complete.

1. [x] **Prepare the app**
   - [x] Install `ai` and `zod` and pin the generated lockfile.
   - [x] Add `.env.example` for `AI_GATEWAY_API_KEY` and optional `AI_MODEL`.
   - [x] Keep credentials server-only; local development uses `.env.local`.

2. [x] **Implement the backend contract first**
   - [x] Create the server-only route using one AI SDK `generateText` request with a Zod-backed structured output.
   - [x] Use AI Gateway with `openai/gpt-5.2` by default, overridable through `AI_MODEL`.
   - [x] Require the model to classify only from stated facts, never invent missing details, and select `other_or_unclear` when the narrative is ambiguous.
   - [x] Return safe, user-readable errors without exposing credentials or raw provider failures.

3. [x] **Prove the live path with a minimal UI** *(reserved for v0)*
   - [x] Connect a deliberately plain textarea and result view to `/api/intake`.
   - [x] Verify a complete input-to-structured-output flow before investing in visual implementation.

4. [x] **Create the interface with v0** *(reserved for v0)*
   - [x] Generate a calm, accessible insurer-style intake interface against the proven `/api/intake` contract: narrative textarea, example claims, submit action, result panel, loading state, validation state, and API-error state.
   - [x] Bring the selected v0-generated components and styling into this repository. This repository remains the source of truth.
   - [x] Replace the temporary UI while preserving the API contract and its validation behavior.

5. [x] **Validate the complete flow**
   - [x] Submit the polished intake UI to `/api/intake`; show the returned category, neutral summary, and confidence percentage.
   - [x] Add representative sample narratives for water and storm damage.
   - [x] Test validation, malformed model output, Gateway failure, all claim types, ambiguous input, and responsive UI states with deterministic mocked UI tests.

6. [x] **Deploy the preview slice**
   - [x] Link the repository to a Vercel project.
   - [x] Configure `AI_GATEWAY_API_KEY` in Preview as a sensitive environment variable.
   - [x] Run lint, mocked tests, and a production build; deploy and smoke-test the protected Preview.
   - [x] Update the tracked README with setup, architecture, API contract, Preview URL, key decisions, and the V1/V2 extension seam.

### Production promotion *(explicitly deferred)*

- [ ] Configure `AI_GATEWAY_API_KEY` in Production.
- [ ] Deploy or promote the validated Preview to Production only with explicit approval.

## Deliberate exclusions

- No data persistence or claimant profile.
- No multi-turn clarification, tools, policy lookup, routing, or escalation.
- No eve in V0. Eve becomes valuable in V2 when the application needs durable multi-step agent state, tools, and explicit stopping conditions.

## End-of-V0 follow-up

- [x] Carry the Udacity-inspired state discipline into the V1 plan: explicit
  state, missing-information tracking, and a deliberate V1 stop condition.
  This is a product-design adaptation, not a claim of source-level review or
  copied implementation.
- [ ] Before starting V1, review Udacity's `claims_intake_agent_solution`, especially `loop.py` and `run.py`. Use it as inspiration for the case-state loop, targeted clarification, and stopping conditions; decide explicitly which patterns fit this product before introducing agent orchestration.
- [ ] There may be more from Udacity to also review, please also update the execution plan (in `vercel-claims-roadmap.md`) accordingly.

## Success criteria

- A live Vercel URL accepts an incident narrative and returns validated structured output.
- The interface clearly communicates triage-only status and handles loading and failure states.
- The code uses Next.js, v0, AI SDK, and AI Gateway deliberately rather than acting as an unstructured prompt wrapper.
- The implementation remains narrow enough to explain and demo confidently in 20 minutes.
