# Clearway

Clearway uses AI to streamline the first-touch property claims process. It
starts with the claimant's ordinary-language account, turns it into visible
structured facts, and lets the model choose the next relevant question from a
bounded set of permitted actions. After each answer, the system evaluates the
updated case instead of following the same fixed questionnaire for everyone.

This makes it practical to collect more claim-specific detail before a person
has to step in. The application still owns validation, session state, safety
limits, and stopping behavior; unresolved, unsafe, or unsupported cases go to
human review rather than being guessed through automatically.

It is deliberately **not** a coverage engine, claims-payment system, or
liability decision-maker.

For the problem, product decisions, implementation scope, and division of work
between AI tools and the project owner, read the [project overview](./OVERVIEW.md).

## What Clearway does today

1. Classifies a plain-language property-claim narrative into a structured
   `CaseState`.
2. Shows collected facts, missing facts, provenance, a proposed route, and
   classification confidence.
3. Asks a bounded series of targeted follow-up questions when material facts
   are missing, while the app owns session state, validation, and stop
   conditions.
4. For terminal **water-damage** sessions only, produces a deterministic next
   step: standard property-adjuster review or human review, with safety-first
   urgency.

`CaseState` is Clearway's canonical structured snapshot of the intake. It
contains the claim category, factual summary, classification confidence, and a
fixed set of material facts covering cause, damage, affected property, timing,
active loss or safety concerns, and injury or third-party involvement. Each
fact records whether it was collected, missing, unclear, or not applicable and
whether it came from the initial narrative or a claimant response. The state
also identifies missing facts and carries a non-binding proposed route with its
rationale and confidence.

The supported intake categories are water damage, fire or smoke, weather or
storm, theft or vandalism, and liability. The operational handoff is
intentionally limited to water damage; other categories remain safe intake
outcomes rather than receiving invented policy logic.

## Use the app

1. Describe the property damage in ordinary language, or choose an example.
2. Submit the narrative to see the structured facts and missing information.
3. Answer each targeted clarification question shown by Clearway.
4. Review the terminal intake result and its non-binding proposed route.
5. For a completed water-damage intake, continue to the deterministic handoff
   to see whether the case proceeds to property-adjuster review or human review.

Use **Unknown water source** from the example choices to exercise the complete
multi-turn workflow:

```text
Claimant narrative
  → structured facts and missing information
  → targeted clarification
  → signed terminal intake session
  → deterministic water-damage next step
```

## Run locally

### Prerequisites

- Node.js 20 or later
- An AI Gateway API key for live model-backed intake

### Installation

```bash
npm install
cp .env.example .env.local
```

Set the following server-only variables in `.env.local`:

```bash
AI_GATEWAY_API_KEY=your_gateway_key
CASE_SESSION_SIGNING_SECRET=a_long_random_secret
# Optional: defaults to the configured AI Gateway model.
AI_MODEL=openai/gpt-5.6-luna
```

Then run:

```bash
npm run dev
```

Open <http://localhost:3000>.

## Test and verify

```bash
npm test
npm run lint
npx tsc --noEmit
npx next build --webpack
```

In development or Preview, Testing mode provides deterministic mock V2
responses without invoking the model. It is unavailable in production.

## API usage

| Endpoint | Purpose |
| --- | --- |
| `POST /api/case-session/start` | Analyze a narrative and create a signed intake session. |
| `POST /api/case-session/respond` | Record a claimant response and return the next intake state. |
| `POST /api/case-handoff` | Turn a signed terminal water-damage session into a deterministic handoff. |
| `POST /api/case-analysis` | Legacy one-turn V1 case-analysis endpoint. |
| `POST /api/intake` | Legacy V0 classification endpoint. |

`/api/case-handoff` accepts only an opaque intake `sessionToken`; it does not
accept browser-supplied facts, route decisions, or mock-policy inputs.
