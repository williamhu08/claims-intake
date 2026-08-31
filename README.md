# The problem

Growing up, water getting into our kitchen floor was more than a maintenance
problem. It became a recurring source of stress and conflict at home. Years
later, now that I am older and living in an apartment, I have encountered water
in the kitchen again—the same visible damage, but with a new layer of
uncertainty.

Apartment living makes the uncertainty sharper because walls, plumbing, and
responsibility can be shared. Water on the kitchen floor might come from your
own sink, a shared pipe, or another unit. You know what you can see, but not
necessarily the source, who is involved, or which detail the insurer needs
next.

Traditional digital intake handles that uncertainty with a predefined
questionnaire. The useful follow-up depends on the claimant's previous answer,
but people must anticipate and encode every branch in advance. The result is
often a long generic form or an early handoff to a person before the claim has
enough specific detail.

# Clearway

Clearway uses AI to streamline that first-touch claims process. It starts with
the claimant's ordinary-language account, turns it into visible structured
facts, and lets the model choose the next relevant question from a bounded set
of permitted actions. After each answer, the system evaluates the updated case
instead of following the same fixed questionnaire for everyone.

This makes it practical to collect more claim-specific detail before a person
has to step in. The application still owns validation, session state, safety
limits, and stopping behavior; unresolved, unsafe, or unsupported cases go to
human review rather than being guessed through automatically.

It is deliberately **not** a coverage engine, claims-payment system, or
liability decision-maker.

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

The supported intake categories are water damage, fire or smoke, weather or
storm, theft or vandalism, and liability. The operational handoff is
intentionally limited to water damage; other categories remain safe intake
outcomes rather than receiving invented policy logic.

### Implementation milestones used in this README

Clearway was built iteratively. The milestone labels describe implementation
scope, not separate products; the full sequence is in the
[Clearway roadmap](./planning/vercel-claims-roadmap.md).

- **V0 — Thin slice:** one narrative becomes a structured claim category,
  summary, and confidence reading.
- **V1 — Fixed-pipeline intake:** a fixed pipeline of model prompts and application
  normalization turns the narrative into a visible case state: collected facts,
  missing facts, claimant provenance, and a proposed route. The pipeline ends
  there; it cannot inspect a partial case and decide to add a new step.
- **V1.5 — Design gate:** the written contract that constrained V2 before it
  was implemented; it is not a separate claimant-facing release.
- **V2 — Dynamic-decomposition intake:** the architectural shift from fixed prompt chaining
  to dynamic decomposition. After each validated partial state, the model may
  choose the next *permitted* action—ask, route, or escalate—while the
  application owns signed session state, validation, and safe stop conditions.
- **V3 — Operational handoff:** the deterministic water-damage next-step layer
  that evaluates a completed V2 session without another model call.
- **V4 — Demo quality:** presentation, reliability, and submission readiness;
  it does not add another major claims capability.

## How the agentic intake works

Clearway's agentic behavior is a small, controlled workflow—not an open-ended
chatbot. Each claimant turn follows the same application-owned sequence:

1. **Read the initial account.** The model extracts a structured case state:
   category, known facts, unknown facts, and a preliminary non-binding route.
2. **Inspect what is still material.** The server allows only one of three next
   actions: ask one targeted clarification, propose a route, or escalate to a
   person. It rejects repeated, irrelevant, or unsafe actions.
3. **Pause for the claimant.** If a question can reduce a material ambiguity,
   the UI shows one question and explains why it matters. The model does not
   silently fill in an answer or continue a hidden loop.
4. **Validate and resume.** The claimant's response is added to a server-signed
   session with its provenance. Clearway re-evaluates the updated facts instead
   of rerunning a fixed sequence of prompts.
5. **Stop safely.** Clearway proposes a non-binding route only when the facts
   support it. Missing information, inability to answer, potential third-party
   involvement, active safety concerns, repeated questions, and safety-budget
   limits lead to human review instead of a guess.

This is the product's key distinction from a thin model wrapper: the model
helps choose the next permitted step, while the application owns the state,
validation, safety limits, and terminal outcome.

## Demo flow

Use **Unknown water source** in the app's example chips to demonstrate the
full workflow:

```text
Claimant narrative
  → structured facts and missing information
  → one targeted clarification
  → signed terminal intake session
  → deterministic water-damage next step
```

For the water-damage handoff, the same terminal intake state always yields the
same next step:

| Condition | Next step |
| --- | --- |
| Clear first-party water loss, resolved safety fact, supported mock context | Standard property-adjuster review |
| Active water loss or safety concern | Urgent human review |
| Missing safety fact, material ambiguity, possible third-party involvement, or no mock record | Human review |

“Human review” is intentionally different from property-adjuster review: it
means Clearway has not safely justified the ordinary property path. It does not
decide what a human reviewer will ultimately do.

## Architecture

```text
Browser (Next.js client)
  │
  ├─ POST /api/case-session/start
  ├─ POST /api/case-session/respond
  │       │
  │       ▼
  │   AI SDK + AI Gateway
  │   structured analysis and bounded tool/action selection
  │       │
  │       ▼
  │   signed intake session state
  │
  └─ POST /api/case-handoff  (terminal water-damage session only)
          │
          ▼
      deterministic V3 fixture lookup, urgency, and handoff precedence
```

The model can analyze a narrative and choose the next allowed clarification
action. It does not own the session, invent arbitrary actions, or make the
water-damage policy/urgency decision. The app validates model output with Zod,
preserves claimant fact provenance, signs session state server-side, and rejects
unsafe transitions.

## Key decisions and tradeoffs

- **Dynamic decomposition in the clarification workflow, not a fixed prompt
  chain.** The next action
  emerges from the current structured state, but only within a bounded action
  set and clarification budget.
- **Application-owned session state.** The browser holds an opaque signed token;
  it never reconstructs canonical facts, route decisions, or session history.
- **Deterministic operational handoff.** The model's output is not treated as
  policy logic. A completed water session is evaluated by fixed, testable rules.
- **Safety before false precision.** Active loss, ambiguity, missing safety
  facts, and potential third-party involvement lead to human review.
- **Narrow scope.** No database, real insurer integration, coverage decision,
  valuation, payment, or photo upload is included yet.

## AI collaboration and decision ownership

AI tools were used throughout the build for execution and generation: exploring
options, drafting plans and documentation, scaffolding code, and iterating on
the interface. That can look end-to-end from a distance, but it was not a
single “build this for me” handoff.

The project owner intervened at the forks where generated work could diverge
from the intended product. Each intervention supplied the **delta**: the
specific correction, constraint, or new direction that shaped the next
iteration. In this sense, human involvement created alignment rather than
merely approving an AI-produced result at the end.

Examples include narrowing the problem to first-touch property-claim triage;
setting the boundary against coverage, fault, liability, payment, and
settlement decisions; inserting V1.5 when the move from a fixed pipeline to
dynamic decomposition required an explicit session contract; using Udacity
material to strengthen the agent-loop design; keeping V2's action set bounded;
and reducing V3 to deterministic water-damage handling rather than a broad
policy platform.

The resulting decisions, tradeoffs, and cuts are recorded in the code and
plans so they can be reviewed and explained—not attributed to a one-shot model
prompt.

## Vercel products used

| Product | Role in Clearway |
| --- | --- |
| Next.js | Full web application and server-side route handlers. |
| AI SDK | Structured model output and clarification action selection. |
| AI Gateway | Server-side model access. |
| v0 | Frontend iteration and the V3 terminal handoff experience. |

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

The test suite covers schema validation, session transitions, claimant-answer
validation, fixture lookup, urgency/precedence rules, and the server handoff
route. In development or Preview, Testing mode provides deterministic mock V2
responses without invoking the model; it is unavailable in production.

## API overview

| Endpoint | Purpose |
| --- | --- |
| `POST /api/case-session/start` | Analyze a narrative and create a signed intake session. |
| `POST /api/case-session/respond` | Record a claimant response and return the next intake state. |
| `POST /api/case-handoff` | Turn a signed terminal water-damage session into a deterministic handoff. |
| `POST /api/case-analysis` | Legacy one-turn V1 case-analysis endpoint. |
| `POST /api/intake` | Legacy V0 classification endpoint. |

`/api/case-handoff` accepts only an opaque intake `sessionToken`; it does not accept
browser-supplied facts, route decisions, or mock-policy inputs.

## Roadmap

- **V0:** narrative in, structured category result out.
- **V1:** visible case state and proposed route.
- **V1.5:** design gate for the bounded V2 session contract.
- **V2:** dynamic, multi-turn clarification with explicit stop conditions.
- **V3:** narrow deterministic water-damage handoff.
- **V4:** demo polish, reliable edge states, architecture notes, and
  presentation rehearsal.

Tracked plans live in [`planning/`](./planning/). Local working notes and
presentation material live in Git-ignored `.docs/`.

## Contributing

This is a private project. If you are contributing, keep changes scoped to a
version plan, preserve claimant-safe language, add focused tests for behavior
changes, and do not commit credentials, claim PII, or model-run metadata.

## Credits

- Built with Next.js, the Vercel AI SDK, AI Gateway, Zod, Vitest, and v0.
- The V2 dynamic-decomposition design was informed by the Udacity
  `03-dynamic-decomposition-solution` exercise, then adapted to Clearway's
  signed claimant-session and safety requirements.
