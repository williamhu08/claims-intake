# V1.5 Decision Record — V2 Action, Session, and Test Contract

> **Planning contract, not a V2 implementation.** V2 depends on this document
> and must implement the schemas, checks, and tests described here before a
> Preview is considered ready.

## Design principle

V1 is a fixed, one-turn analysis: `narrative → CaseState`. V2 is dynamic
decomposition: after each validated partial state, the model chooses one
permitted next action—ask, route, or escalate. The application, not the model,
defines the permitted actions, validates their arguments, owns the state, and
enforces terminal conditions.

## Model-selectable actions

The model may emit exactly one action for a server turn. All strings are
bounded by existing claimant-facing limits unless a V2 schema introduces a
stricter named constant.

| Action | Required arguments | Application preconditions | Result |
| --- | --- | --- | --- |
| `ask_clarifying_question` | `question`, `factKeys` (1–2), `whyItMatters` | Every key is currently `missing` or `unclear`; the question is not equivalent to a prior question; fewer than two questions have been shown; the answer can change a permitted route or reduce material uncertainty. | Store as `pendingAction`; pause for claimant input. |
| `propose_route` | constrained `kind`, `rationale` | The route is supported by the validated `CaseState`; no material ambiguity or safety condition remains. | Terminal session with `route_supported`. |
| `escalate_to_human` | constrained `stopReason`, `rationale` | The specified reason is supported by the state, question history, or safety budget. | Terminal human-review outcome. |

The model cannot change `CaseState` directly, select a coverage/fault/payment
decision, or access arbitrary tools. A claimant answer is first validated and
then analyzed into a new application-owned `CaseState` before the next action
is selected.

Facts carried from V1 retain `source: "claimant_narrative"`. When a later
claimant clarification supports a newly collected or updated fact, V2 records
`source: "claimant_response"`; it must not make a later answer look as though
it appeared in the original narrative.

## Terminal stop reasons

```ts
type StopReason =
  | "route_supported"
  | "unresolved_ambiguity"
  | "claimant_cannot_answer"
  | "safety_review"
  | "safety_budget_exhausted";
```

- `route_supported` is valid only for `propose_route`.
- Every other reason is valid only for `escalate_to_human`.
- A claimant who says they do not know, does not respond, or has already
  answered the equivalent question must end at `claimant_cannot_answer` or
  `unresolved_ambiguity`; Clearway must not repeat itself.
- A collected or materially unclear active loss/safety signal ends at
  `safety_review` rather than awaiting another normal clarification.
- A provider failure, malformed action, invalid signature, or unhandled stop
  reason is a safe API failure—not a fabricated terminal model action. The UI
  offers retry/reset and preserves no untrusted state.

## Server-owned session

The browser carries a compact, opaque signed payload; the server owns its Zod
schema and verifies the signature before every resume. V2 deliberately has no
database or authentication.

```ts
type CaseSessionState = {
  version: 1;
  issuedAt: string;
  expiresAt: string;
  caseState: CaseState;
  clarificationHistory: Array<{
    factKeys: CaseFactKey[];
    question: string;
    whyItMatters: string;
    answer?: string | "no_response";
  }>;
  pendingAction?: {
    kind: "ask_clarifying_question";
    question: string;
    factKeys: CaseFactKey[];
    whyItMatters: string;
  };
  actionTrace: Array<{
    kind: "ask_clarifying_question" | "propose_route" | "escalate_to_human";
    at: string;
  }>;
  terminal?: {
    kind: "propose_route" | "escalate_to_human";
    stopReason: StopReason;
    rationale: string;
  };
};
```

V2 will use a versioned HMAC signature over a canonical serialized payload.
Invalid/tampered signatures, expired payloads, malformed responses, or a
response submitted without a matching pending question are rejected. The UI
can reset to a new V1 analysis; it must not try to repair or trust the old
session client-side.

## Safety budgets and configuration

These values are server-side configuration, named constants/config accessors,
and test-overridable—not prompt text or magic numbers in a loop:

| Configuration | Initial V2 value | Purpose |
| --- | --- | --- |
| `CASE_SESSION_SIGNING_SECRET` | required secret | HMAC session integrity. |
| `CASE_SESSION_TTL_SECONDS` | `1800` | Reject stale signed sessions. |
| `CASE_SESSION_MAX_INPUT_TOKENS` | `12000` | Provider-token safety ceiling across a server interaction. |
| `CASE_SESSION_MAX_WALL_CLOCK_MS` | `10000` | Server-interaction safety ceiling. |
| `CASE_SESSION_MAX_CLARIFICATIONS` | `2` | Claimant-experience limit, separate from provider budget. |

The token/wall-clock budget is a safety net. Normal termination must follow a
validated action or stop condition, never a hidden fixed iteration count.

## AI SDK and provider control

V2 will use direct AI SDK tool calling through AI Gateway. Individual tools
mirror the three action schemas; the model receives validated case/session
context and may call only one action tool per server turn. A structured action
or tool-call result is the normal control signal. Unexpected provider results
or tool arguments fail safely.

eve is deferred because V2 has no policy/evidence tools, durable workflow, or
parallel orchestration. Re-evaluate it in V3 when those needs are real.

## Unit-test contract

V2 must use mocked AI SDK tool results; live Gateway calls are limited to
synthetic Preview smoke checks and cannot substitute for deterministic tests.

| Unit under test | Required assertions |
| --- | --- |
| Session codec/signature | valid state round-trips; altered, expired, wrong-version, and malformed payloads are rejected. |
| Action eligibility | action arguments outside the schema, unsupported routes, ungrounded fact keys, repeat/equivalent questions, and over-budget questions are rejected. |
| State transition | each accepted answer updates only permitted, claimant-grounded facts and clears `pendingAction`; no answer creates the correct terminal escalation. |
| Stop policy | clear first-party water routes; material ambiguity, third-party signal, safety signal, and exhausted safety budget terminate with the correct reason. |
| Trace validation | every fixture emits an ordered, bounded trace with exactly one terminal state and no post-terminal action. |

The fixture matrix includes clear water damage, ambiguous source resolved by one
answer, possible third-party involvement, active safety concern, claimant
unable to answer, repeated question, tampered session, invalid model action,
budget exhaustion, and exact gibberish. Claimant-flow UI tests remain separate
from this server/session unit suite.
