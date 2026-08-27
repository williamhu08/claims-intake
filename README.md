# Clearway

Clearway is an AI-assisted, first-touch intake for ambiguous property
claims. Instead of asking a claimant to complete a long form before they can
get started, it accepts a plain-language description and returns a narrow,
structured case state:

- `claimType`
- `summary`
- collected and missing facts
- a proposed, non-binding route
- confidence in the classification

It intentionally does **not** decide coverage, liability, fault, payment, or
settlement eligibility.

## V1 status

The V1 interface, case-state contract, and AI Gateway path are integrated and
verified in a protected Vercel Preview:

https://claims-intake-ov1ck2c4q-williamhu08s-projects.vercel.app

The Preview requires access through the owner&apos;s Vercel account. Production is
intentionally not configured or promoted yet.

## Why this problem

Property claims are often reported with incomplete, emotionally loaded
accounts: a claimant knows something went wrong, but not the insurer&apos;s
categories or the facts that later determine routing. Clearway starts with
the claimant&apos;s language, gives a clear initial classification, and makes the
next interaction legible without pretending to make an insurance decision.

## V1 architecture

```text
Claimant narrative
        |
        v
Structured-intake interface
        |
        v
POST /api/case-analysis
        |
        v
AI SDK generateText + Zod structured output
        |
        v
Vercel AI Gateway (openai/gpt-5.2 by default)
        |
        v
Application-normalized CaseState
```

The API owns the schema, model instructions, and normalization. It derives the
missing-fact list from fact statuses, attaches claimant-narrative provenance,
and keeps credentials and model policy server-side. The frontend consumes only
the stable `/api/case-analysis` contract.

## API contract

`POST /api/case-analysis`

```json
{
  "narrative": "A pipe burst under the kitchen sink overnight..."
}
```

The narrative must be trimmed and between 20 and 4,000 characters.

```json
{
  "claimType": "water_damage",
  "summary": "A pipe burst under the kitchen sink damaged the cabinet and floor.",
  "classificationConfidence": 0.98,
  "facts": [
    {
      "key": "incident_cause",
      "label": "What caused the incident",
      "status": "collected",
      "value": "A pipe burst under the kitchen sink.",
      "source": "claimant_narrative"
    }
  ],
  "missingFactKeys": ["loss_timing"],
  "proposedRoute": {
    "kind": "property_adjuster_review",
    "rationale": "The narrative describes first-party water damage.",
    "confidence": 0.91
  }
}
```

Each case includes all six canonical fact keys. A fact is `collected`,
`missing`, `unclear`, or `not_applicable`; the server derives
`missingFactKeys` from `missing` and `unclear` statuses. The route is a visible
intake recommendation, never a coverage, fault, liability, payment, or
settlement decision.

The legacy V0 `POST /api/intake` endpoint remains temporarily for compatibility
while the V1 case-analysis contract is adopted.

## Run locally

```bash
npm install
cp .env.example .env.local
# Set AI_GATEWAY_API_KEY in .env.local
npm run dev
```

Then open `http://localhost:3000`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `AI_GATEWAY_API_KEY` | Local development | Server-only Vercel AI Gateway credential. |
| `AI_MODEL` | No | Overrides the default `openai/gpt-5.2` model. |

In Vercel, the key is configured as a sensitive **Preview** environment
variable. It is not committed to the repository; Production is intentionally
not configured yet.

## Verification

```bash
npm run lint
npm test
npx next build --webpack
```

The deployed V1 backend was smoke-tested through Vercel-authenticated access
with a synthetic burst-pipe narrative. It returned a schema-valid
`water_damage` `CaseState` with grounded facts and a non-binding property
adjuster recommendation.

## Key implementation decisions

- **Single structured model call:** V1 makes the system's understanding visible
  without pretending to already be a conversational agent.
- **Application-owned state:** Zod-backed output plus deterministic
  normalization makes facts, missing information, and route recommendations
  explicit rather than leaving the product as a wrapper around a prompt.
- **Neutral, triage-only language:** prevents the product from implying a
  coverage or settlement decision.
- **v0 owns the first UI iteration:** the interface was generated against the
  proven API contract instead of being hand-built before visual exploration.
- **Preview before production:** the deployed slice is verified without
  promoting it to an official production release.

## What comes next

- **V2:** add bounded, targeted clarification based on the observed case state.
  The agent will dynamically choose among permitted next actions rather than
  run a fixed prompt chain; it will escalate rather than guess or loop
  indefinitely.
- **V3:** introduce policy lookup, evidence-backed routing, uncertainty
  escalation, and an adjuster-ready handoff.
