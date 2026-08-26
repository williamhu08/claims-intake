# First Notice

First Notice is an AI-assisted, first-touch intake for ambiguous property
claims. Instead of asking a claimant to complete a long form before they can
get started, it accepts a plain-language description and returns a narrow,
structured triage assessment:

- `claimType`
- `summary`
- `confidence`

It intentionally does **not** decide coverage, liability, fault, payment, or
settlement eligibility.

## V0 status

The V0 backend contract and its AI Gateway path are live and verified. The
claimant-facing UI is deliberately reserved for v0 and has not yet been
integrated into this repository.

## Why this problem

Property claims are often reported with incomplete, emotionally loaded
accounts: a claimant knows something went wrong, but not the insurer&apos;s
categories or the facts that later determine routing. First Notice starts with
the claimant&apos;s language, gives a clear initial classification, and makes the
next interaction legible without pretending to make an insurance decision.

## V0 architecture

```text
Claimant narrative
        |
        v
v0-generated intake interface (next)
        |
        v
POST /api/intake
        |
        v
AI SDK generateText + Zod structured output
        |
        v
Vercel AI Gateway (openai/gpt-5.2 by default)
        |
        v
Validated claimType, summary, confidence
```

The API owns the schema and model instructions. This keeps credentials and
model policy server-side; the future v0 interface will consume only the stable
`/api/intake` contract.

## API contract

`POST /api/intake`

```json
{
  "narrative": "A pipe burst under the kitchen sink overnight..."
}
```

The narrative must be trimmed and between 20 and 4,000 characters.

```json
{
  "claimType": "water_damage",
  "summary": "A pipe burst under the kitchen sink overnight...",
  "confidence": 0.98
}
```

`claimType` is one of `water_damage`, `fire_or_smoke`,
`weather_or_storm`, `theft_or_vandalism`, `liability`, or
`other_or_unclear`. The model is instructed to use only stated facts and to
choose `other_or_unclear` when the account does not support a reliable
classification.

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
variable. It is not committed to the repository.

## Verification

```bash
npm run lint
npm test
npx next build --webpack
```

The deployed backend was smoke-tested through Vercel-authenticated access with
a representative fire-damage narrative and returned a schema-valid
`fire_or_smoke` result.

## Key V0 decisions

- **Single structured model call:** V0 proves useful classification without
  hiding a workflow inside a long prompt.
- **Zod-backed output:** schema validation makes the UI contract explicit and
  gives later versions a stable case-state foundation.
- **Neutral, triage-only language:** prevents the product from implying a
  coverage or settlement decision.
- **v0 owns the first UI iteration:** the interface will be generated against
  the proven API contract instead of being hand-built before visual exploration.
- **Preview before production:** the deployed slice is verified without
  promoting it to an official production release.

## What comes next

- **V1:** persist and display explicit case facts, missing facts, and a
  proposed route.
- **V2:** add targeted, multi-turn clarification, tools, explicit stop
  conditions, and durable case state. Before this work begins, review
  Udacity&apos;s `claims_intake_agent_solution`, especially `loop.py` and
  `run.py`, and decide which orchestration patterns belong in this product.
- **V3:** introduce policy lookup, evidence-backed routing, uncertainty
  escalation, and an adjuster-ready handoff.
