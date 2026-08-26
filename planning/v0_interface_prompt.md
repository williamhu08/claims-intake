# v0 interface prompt — Clearway V0

Use this prompt in v0 when iterating on the visual implementation. The current
repository keeps the production API contract and remains the source of truth.

```text
Design a calm, accessible desktop-and-mobile web interface for “Clearway,”
an AI-assisted property insurance claims intake product. This is first-touch
triage, not a coverage, liability, or settlement decision.

The primary screen needs:
- A compact top bar with the product name “Clearway” and the descriptor
  “Property claims intake”.
- A strong hero: “Tell us what happened.” Supporting copy should invite a
  claimant to describe an incident in ordinary language.
- A two-column layout on desktop, one column on mobile.
- Left intake card: heading “Describe the incident”, one required textarea
  labelled “What happened?”, concise helper text, character count, example
  chips for Water damage and Storm damage, and a primary “Get initial
  assessment” button.
- Right assessment card with three states: an empty state explaining what will
  appear; a loading state; and a result state that presents claim type, factual
  summary, and confidence percentage with a subtle progress bar.
- Inline validation and a safe API-error state.
- A clear disclosure: “Initial triage only. This is not a coverage decision, a
  liability determination, or a settlement offer.”

Visual direction: warm off-white background, white form card, pale moss-green
result card, forest-green primary action, subtle borders and shadows, generous
spacing, editorial serif display type paired with an approachable sans-serif
body. Avoid generic chatbot UI, gradients, dashboards, glassmorphism, and
medical or emergency visual language. The tone should be calm, plainspoken,
and trustworthy.

Use accessible semantic HTML, high-contrast text, visible keyboard focus,
buttons with real disabled styles, and responsive behavior. Do not add
authentication, a claims history, policy details, file upload, routing,
coverage determination, or chat conversation.
```
