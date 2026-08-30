# V2 Release Verification Record

> **Status: complete.** Deterministic verification is complete, protected
> Preview acceptance is user-verified, and the V2 → V3 design gate is recorded.
> Live Gateway smoke evidence remains optional supporting evidence.

## Verified on 2026-08-29

| Check | Result | Evidence |
| --- | --- | --- |
| V2 claimant-flow and server/session tests | Passed | `npm test`: 9 test files, 78 tests passed. The suite includes mocked claimant-flow recovery, reset, malformed-response, duplicate-submit, answer-type, session/action, and route tests. |
| Claimant-facing accessibility and responsive assertions | Passed | The V2 component suite covers labelled controls, `aria-live` status, `role="alert"`, and responsive layout classes. |
| Lint | Passed | `npm run lint` completed with no findings. |
| Production build | Passed with Webpack | `npx next build --webpack` compiled, type-checked, generated all eight routes, and completed successfully. |

## Build-environment note

The default `npm run build` uses Turbopack and could not complete in this
execution environment because Turbopack was not permitted to bind an internal
port. A prior font-fetch restriction was resolved by retrying with network
access. The Webpack build is the documented production-build fallback and
completed successfully; this is not treated as an application compilation or
type-check failure.

## Remaining Step 5 work

- The protected Preview acceptance check is **user-verified**. It covers the
  claimant-facing question/history/escalation flow and narrow viewport.
- Make no more than two synthetic live AI Gateway smoke calls; record each
  model invocation in ignored `.runs/` with redacted inputs and outputs only
  if Preview credentials and Gateway capacity are available. This is optional
  supporting evidence, not a V2 completion gate.
- The V2 → V3 design boundary is defined in
  [V2 → V3 Handoff Criteria](./v2_v3_handoff_criteria.md).

## Scope boundary

This record does not promote a Preview to Production and does not authorize
coverage decisions, fault or payment decisions, or real insurer operations.
The narrow V3 mock-policy, urgency, and handoff capability is separately
defined in the V2 → V3 handoff criteria.
