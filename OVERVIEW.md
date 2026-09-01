# Clearway — Project Overview

Clearway was built iteratively. The milestone labels describe implementation
scope, not separate products; the full sequence is in the
[Clearway roadmap](./planning/vercel-claims-roadmap.md).

## The problem

Property damage is stressful before the insurance process even begins. Growing
up, water repeatedly getting into our kitchen floor caused real stress and
conflict at home. Now that I live in an apartment, the same kind of incident is
even more ambiguous: water may come from my unit, shared plumbing, or another
unit, and I may not know which details an insurer needs next.

Traditional digital claim intake usually asks everyone a fixed set of
questions. That approach cannot respond naturally to what a claimant just
said, so it either collects generic information or sends an incomplete case to
a person for follow-up.

Clearway is an AI-powered first-touch intake for property claims. A claimant
describes what happened in ordinary language. Clearway turns that account into
visible structured facts, identifies what is still unknown, and asks the next
question that matters. It then proposes a non-binding route or escalates the
case to a person instead of guessing. For completed water-damage intakes, it
also produces a deterministic next step: property-adjuster review or human
review, with safety-first urgency.

## Key decisions

- **Dynamic decomposition instead of a fixed questionnaire.** The model
  inspects the evolving case after each answer and chooses one permitted next
  action: ask a targeted question, propose a route, or escalate.
- **The application—not the model—owns control.** Clearway validates structured
  output, signs session state, preserves fact provenance, limits clarification
  turns, and enforces safe stopping conditions.
- **Safety before false precision.** Active loss, missing safety information,
  material ambiguity, or possible third-party involvement leads to human
  review rather than a confident-looking guess.
- **Deterministic operational logic.** The water-damage handoff uses fixed,
  testable rules and mock handling context without another model call. Model
  output is not treated as policy logic.
- **Deliberately narrow scope.** Clearway handles first-touch triage, not
  coverage, fault, liability, valuation, payment, or settlement. The
  operational handoff is limited to water damage so the project can demonstrate
  one defensible end-to-end workflow instead of shallow logic across every
  category.

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
