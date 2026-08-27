# **PRELIMINARY — V3 REAL WORKFLOW PLAN**

> **V3 DEPENDS ON V2. Do not implement this plan until V2 provides a validated
> case session, targeted clarification, action trace, and explicit terminal
> state. This document is contract/design preparation only—not authorization to
> bypass or duplicate V2.**

## Purpose

V3 will turn a completed V2 session into an evidence-backed, operationally
useful handoff. It will add mock policy context, operational severity/urgency,
deterministic route/escalation checks, and an adjuster-ready handoff.

It must preserve Clearway's boundary: it does not make coverage, fault,
liability, payment, or settlement decisions.

## Required V2 dependency contract

Before V3 starts, V2 must expose a validated terminal `CaseSessionState` with:

```ts
type TerminalCaseSessionState = {
  caseState: CaseState;
  clarificationHistory: Array<{
    question: string;
    answer: string | "no_response";
    factKeys: CaseFactKey[];
  }>;
  actionTrace: Array<{
    action: "ask_clarifying_question" | "propose_route" | "escalate_to_human";
    rationale: string;
  }>;
  stopReason:
    | "route_supported"
    | "unresolved_ambiguity"
    | "claimant_cannot_answer"
    | "safety_review"
    | "safety_budget_exhausted";
};
```

V3 consumes this terminal session. It must not recreate V2's question loop,
silently infer missing information, or use a different fact model.

## Preliminary V3 mock contracts

### 1. Policy context — mock only

```ts
type MockPolicyContext = {
  policyId: string;
  status: "active" | "not_found" | "needs_human_review";
  propertyAddressMatch: "confirmed" | "unconfirmed";
  relevantEndorsements: string[];
  evidence: Array<{ source: "mock_policy_store"; detail: string }>;
};
```

This context may explain why a case needs review. It must never produce a
coverage determination.

### 2. Operational severity/urgency

```ts
type OperationalSeverity = {
  level: "urgent" | "standard" | "human_review";
  rationale: string;
  evidenceFactKeys: CaseFactKey[];
};
```

Use active loss/safety, stated damage, and unresolved ambiguity—not dollar
thresholds, valuation, or a payment estimate.

### 3. Evidence-backed handoff

```ts
type AdjusterHandoff = {
  recommendedDestination:
    | "property_adjuster_review"
    | "liability_review"
    | "human_triage_review";
  severity: OperationalSeverity;
  summary: string;
  collectedFacts: CaseFact[];
  unresolvedFacts: CaseFactKey[];
  policyContext: MockPolicyContext;
  actionTrace: TerminalCaseSessionState["actionTrace"];
  escalationReason?: string;
};
```

## Deterministic decision boundaries

Application code—not the model alone—must enforce:

1. An active loss or safety concern cannot receive a routine route without an
   `urgent` severity or human review.
2. An unresolved material ambiguity, policy mismatch, or unsupported route
   escalates to `human_triage_review`.
3. Every handoff must cite only claimant facts, V2 action history, or mock
   policy-store evidence.
4. The V3 model may summarize evidence, but cannot add evidence sources or
   change the controlled route/severity vocabulary.

## Required tests before V3 is complete

- Unit tests for severity decisions: active loss, known non-active damage, and
  insufficient safety information.
- Mock-policy tests: active match, not found, address mismatch, and incomplete
  policy context.
- Handoff tests: supported property route, liability review, unresolved
  ambiguity escalation, and safety escalation.
- Provenance tests: every handoff statement maps to a claimant fact, V2 action,
  or mock-policy record.
- Deterministic end-to-end fixtures that begin with V2 terminal sessions—not
  raw narratives alone.

## Deliberate cuts

- No real insurer integration or real policy data.
- No actual queue write, adjuster assignment, payment, or coverage decision.
- No severity based on dollars in the first V3 iteration.
- No V3 implementation until V2 is complete and its terminal-session contract
  is approved.

## V3 start gate

Begin implementation only after all are true:

- [ ] V2 has a deployed Preview with deterministic terminal-session fixtures.
- [ ] V2's stop reasons, action trace, and clarification history are stable.
- [ ] The mock policy data shape and operational severity vocabulary are
  approved.
- [ ] The adjuster-handoff audience and minimum fields are agreed.
