# Clearway

For the problem, product decisions, implementation scope, and division of work
between AI tools and the project owner, read the [project overview](./OVERVIEW.md).

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

Clearway supports intake for water damage, fire or smoke, weather or storm,
theft or vandalism, and liability. The deterministic operational handoff is
currently limited to water damage.

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
