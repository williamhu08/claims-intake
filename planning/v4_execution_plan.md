# V4 Execution Plan — Demo and Submission Quality

## Purpose

V4 does not add a new claims capability. It makes the existing Clearway V2 →
V3 experience reliable, understandable, and ready for the Vercel final-round
submission and live presentation.

## Submission target

The finished submission must provide:

1. A public GitHub repository with reviewable history.
2. A shareable deployed URL.
3. A README covering the problem, key decisions, and AI/human collaboration.
4. A one- to two-paragraph submission blurb.

## Boundaries

- Do not add a major new product capability, real policy integration,
  persistence, coverage logic, photo upload, or a new agent framework.
- Prefer small, demonstrable reliability and claimant-experience fixes.
- Do not claim a deployment, Preview verification, or live model result unless
  it has actually occurred.
- Keep the V3 water-damage handoff clearly labelled as deterministic demo
  handling context, not an insurance decision.

## Steps

1. [x] **Define the V4 scope and submission checklist**
   - [x] Translate the final-round requirements into this execution plan.
   - [x] Keep V4 focused on presentation quality rather than feature expansion.

2. [ ] **Finish the public project narrative**
   - [ ] Make the README understandable without internal version vocabulary.
   - [ ] Explain the problem, architecture, key decisions, deliberate cuts, and
     the AI/human division of work.
   - [ ] Write and review the separate one- to two-paragraph submission blurb.

3. [ ] **Create a compact demo script and decision guide**
   - [ ] Prepare a 20-minute narrative in the required order: problem,
     solution, code, and AI journey.
   - [ ] Select reliable demo claims: clear water/property route, unresolved
     water source, active loss/safety, and potential third-party involvement.
   - [ ] Record key code pointers and concise explanations for what Clearway
     does, what it intentionally does not decide, and why.

4. [ ] **Audit the claimant experience** *(reserved for Vercel v0 where visual)*
   - [ ] Review first-load/empty, input validation, model-loading, question,
     answer, terminal property-review, terminal human-review, urgent-review,
     and retry/reset states.
   - [ ] Ensure the V3 handoff remains understandable beside the V2 facts and
     history, including clearly labelled mock/demo context.
   - [ ] Make only small UI or copy fixes required for a credible live demo.

5. [ ] **Verify quality and deployment**
   - [ ] Run tests, lint, TypeScript, and the Webpack production build after
     final changes.
   - [ ] Confirm repository visibility and a shareable Preview/deployed URL.
   - [ ] Manually exercise the selected demo paths in the deployed experience.

6. [ ] **Package the handoff**
   - [ ] Review the README and summary blurb for clear outside-reader language.
   - [ ] Confirm the GitHub link and deployed URL are ready to send at least
     24 hours before the presentation.
   - [ ] Rehearse the demo and Q&A around scope, technical decisions, cuts, and
     AI collaboration.

## Definition of done

- An outside reviewer can understand Clearway, its boundaries, and its key
  decisions from the README and deployed flow without knowing the V0–V4 labels.
- The demo reliably shows a bounded AI intake workflow followed by a
  deterministic, non-binding water-damage handoff or safe human review.
- The repository, deployed URL, written overview, and summary blurb are ready
  for submission.
