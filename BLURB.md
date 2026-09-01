# Clearway — Submission Blurb

Water damage has caused real stress in my life. Growing up, water getting into
our kitchen floor became more than a repair problem: uncertainty about the
cause, responsibility, and what to do next led to arguments and became a source
of strife at home. Now that I live in an apartment with shared walls and
plumbing, those questions feel even more immediate.

When water damage occurs, one of the first practical steps is to file an
insurance claim. But filing can begin a long feedback loop. An insurer reviews
the initial account, asks a follow-up based on that account, waits for the
claimant's response, and then decides what to ask next. Because each question
depends on the previous answer, several rounds of review and response may be
needed before the case has enough detail. I built Clearway to shorten that loop.

- **Adaptive intake:** A claimant describes what happened in ordinary
  language. Clearway extracts the known facts, makes missing information
  visible, and asks the next relevant question based on the evolving case. The
  goal is to give a person a specific, structured account instead of another
  generic form response.

- **Bounded AI:** After each claimant response, the model may choose one of
  three actions: ask one targeted clarification, propose a non-binding route,
  or escalate to a person. The application—not the model—owns the signed
  session, validates every update, preserves where each fact came from, limits
  clarification turns, and enforces safe stopping conditions. Active loss,
  missing safety information, or unresolved ambiguity leads to human review
  rather than a guess.

- **Deterministic handoff and narrow scope:** For completed water-damage
  intakes, fixed application rules produce the next step: property-adjuster
  review, human review, or urgent human review. The model does not invent policy
  logic. Clearway also does not decide coverage, fault, liability, valuation,
  payment, or settlement; it demonstrates one defensible workflow from a
  claimant's first account to an actionable handoff.
