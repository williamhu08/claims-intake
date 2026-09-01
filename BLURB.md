# Clearway — Submission Blurb

Water damage has caused real stress in my life. Growing up, water getting into
our kitchen floor became more than a repair problem: uncertainty about the
cause, responsibility, and what to do next led to arguments and became a source
of strife at home. Now that I am older and living in an apartment with shared
walls and plumbing, that uncertainty feels even more immediate. When water
damage occurs, one of the first practical steps is to file a claim with the
insurance company. But filing the claim can begin a long feedback loop: the
insurer reviews the initial account, asks a follow-up question based on that
account, waits for the claimant's response, and then decides what to ask next.
Because each question depends on the previous answer, the process can require
several rounds of review and response. I built Clearway to shorten that loop. A
claimant describes what happened in ordinary language; Clearway turns the
account into visible facts, identifies what is still missing, and adaptively
asks the next question that matters. The result reaches a person with more
specific, structured context rather than another generic form response.

The core workflow uses bounded dynamic decomposition. After each claimant
response, the model inspects the evolving case and chooses one permitted next
action: ask a targeted clarification, propose a route, or escalate. The model
does not control the workflow by itself. The application owns the signed
session state, validates structured output, preserves where each fact came
from, limits clarification turns, and enforces stop conditions. Missing safety
information, unresolved ambiguity, possible third-party involvement, or an
active loss leads to human review instead of false precision. For completed
water-damage intakes, Clearway adds a deterministic operational handoff using
local mock handling context. The same supported facts always produce the same
next step—standard property-adjuster review, human review, or urgent human
review—without asking the model to invent policy logic. I kept that operational
layer deliberately narrow: Clearway does not decide coverage, fault, liability,
valuation, payment, or settlement. The goal is one defensible end-to-end claims
workflow in depth, with every important boundary and tradeoff visible in the
product and code.
