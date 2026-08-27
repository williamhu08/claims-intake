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
| **V2 — Make it act** | Let the system gather missing information. | Multi-turn clarification, in-session case state, targeted questions, and an explicit stop condition. | AI SDK tool use; evaluate eve for orchestration. |
| **V3 — Make it trustworthy** | Produce an actionable, evidence-backed handoff. | Mock policy lookup, operational severity/urgency, routing, escalation for low confidence or unresolved facts, and an adjuster-ready handoff. | AI SDK, AI Gateway, and the selected agent/tool layer. |
| **V4 — Make it compelling** | Deliver a polished, presentation-ready submission. | Demo scenarios, visual and interaction polish, reliable edge states, README and architecture notes, final deployment, and a concise presentation. | Full stack, used deliberately. |

## Six-hour target

The realistic six-hour version is:

> A claimant describes water damage. The agent extracts visible case facts, asks one or two targeted questions, looks up a mock policy, then either routes the claim to a property adjuster or escalates it because key uncertainty remains.

Prioritize V0 and V1, one convincing V2 flow, a light V3 policy lookup/escalation, then V4 polish and presentation. Cut authentication, a database, real insurer integrations, multiple policy types, and broad edge-case coverage.

## V3 severity decision

V3 should add **operational severity/urgency** only when it helps a real
handoff decision. It is not a damage valuation, coverage determination, or
payment estimate.

Initial vocabulary:

- `urgent` — active water or fire loss, electrical/structural safety concern,
  or immediate mitigation may be needed;
- `standard` — damage is known with no active safety or mitigation signal; and
- `human_review` — the available facts cannot establish urgency safely.

Every severity result must cite concise, claimant-grounded evidence and a
rationale. Do not begin with dollar thresholds; introduce them only if a later
policy/evidence design justifies them.

## Final demo story

**Claimant story** → **visible structured facts** → **targeted clarification** → **policy/routing decision** → **evidence-backed handoff or escalation**

The model is one component inside the product system. The app owns the claim state, tools, clarification flow, routing, escalation, and stopping behavior.
