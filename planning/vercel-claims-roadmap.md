# Claims Intake Agent — Project Roadmap

## Product

Build an AI-powered insurance claims intake experience for ambiguous property claims. A claimant describes what happened in plain language; the product progressively turns that story into a structured, actionable case handoff.

The product is deliberately narrow: **first-touch triage for property claims**. Rather than force the claimant through a long form, it gathers the minimum information needed to route the case or escalate it to a human.

## Core design principles

- **Start thin. End deep.** V0 can be a single model call; the finished project must become a real workflow.
- **Narrow problem, deep execution.** Add depth to meaningful decisions rather than surface area.
- **Vertical slice first.** Every version should be usable and shippable.
- **Anti-thin-wrapper test:** If replacing the LLM with one `generateText(systemPrompt + userMessage)` call would leave most of the product unchanged, the product is still too thin.

## Vercel product strategy

| Product | Role |
| --- | --- |
| Next.js | Full web application: UI and server-side routes. |
| AI SDK | Model calls, structured output, streaming, and tool use. |
| AI Gateway | Model access through the application. |
| v0 | Accelerate initial UI implementation and iteration. |
| eve | Use only if it materially improves agent orchestration; do not force it into V0. |

## Version roadmap

| Version | Product goal | What changes | Vercel products |
| --- | --- | --- | --- |
| **V0 — Make it exist** | One claim in, one structured result out. | One page with claim input, submit button, and result card. Return `claimType`, `summary`, and `confidence`. | Next.js, AI SDK, AI Gateway; v0 for UI acceleration. |
| **V1 — Make it legible** | Make the system's understanding visible and correctable. | Show structured case state: collected facts, missing facts, and proposed route. Add clear loading and error states. | Next.js, AI SDK, AI Gateway. |
| **V1.5 — Design gate** | Decide what V2 is allowed to do. | Record the bounded action set, session contract, dynamic-decomposition rules, stop/safety conditions, V3 boundary, and tests required before V2 implementation. No claimant-facing capability. | AI SDK tool-use design; evaluate eve but do not require it. |
| **V2 — Make it act** | Let the system gather missing information. | Multi-turn clarification, in-session case state, targeted questions, and an explicit stop condition. | AI SDK tool use; evaluate eve for orchestration. |
| **V3 — Make it useful** | Produce one actionable water-damage handoff. | Deterministic mock policy context, safety-first urgency, and an adjuster-ready property handoff or human-review escalation. | Existing Next.js/V2 stack; no new orchestration layer. |
| **V4 — Make it compelling** | Deliver a polished, presentation-ready submission. | Demo scenarios, visual and interaction polish, reliable edge states, README and architecture notes, final deployment, and a concise presentation. | Full stack, used deliberately. |

V1.5 implementation details live in the [execution plan](./v1_5_execution_plan.md),
[water-source decision](./v1_5_water_source_decision.md), and
[V2 session/test contract](./v1_5_v2_session_contract.md). They intentionally
keep V2 bounded and defer policy, severity, and evidence work to V3.

## Six-hour target

The realistic six-hour version is:

> A claimant describes water damage, answers one or two targeted questions,
> then receives either a non-binding property-adjuster handoff or a
> human-review outcome because key uncertainty remains.

Prioritize V0 and V1, one convincing V2 flow, a light V3 policy
lookup/escalation, then V4 polish and presentation. Cut authentication, a
database, real insurer integrations, multiple policy types, and broad
edge-case coverage.

## Narrow V3 severity decision

V3 adds **operational urgency** only for the water-damage handoff and only from
the existing `active_loss_or_safety` fact. It is not a damage valuation,
coverage determination, or payment estimate.

Initial vocabulary:

- `urgent` — active loss or safety concern; hand off immediately for human
  review.
- `standard` — no active loss or safety concern; continue to the non-binding
  property-adjuster handoff.
- `human_review` — the safety fact is missing, unclear, or contradictory; do
  not infer urgency.

Every severity result must cite its fact provenance and the deterministic rule
that produced it. Urgency prioritizes an already-determined disposition; it
does not choose property-adjuster review over human review.

## Final demo story

**Claimant story** → **visible structured facts** → **targeted clarification** → **policy/routing decision** → **evidence-backed handoff or escalation**

The model is one component inside the product system. The app owns the claim state, tools, clarification flow, routing, escalation, and stopping behavior.
