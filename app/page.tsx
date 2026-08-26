import { IntakeForm } from "@/components/intake-form";

export default function Home() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md bg-primary font-serif text-sm font-semibold text-primary-foreground"
              aria-hidden="true"
            >
              C
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Claims Intake
            </span>
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            First Notice of Loss
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-accent">Property claims</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-foreground text-balance sm:text-4xl">
            Tell us what happened, and we&apos;ll route it for you.
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground text-pretty">
            Describe the incident in your own words. We provide an instant initial
            reading of the claim category so it reaches the right team faster.
          </p>
        </div>

        <div
          role="note"
          className="mt-6 rounded-lg border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground text-pretty"
        >
          This is an early triage assessment only. It does not determine coverage,
          liability, fault, or payment, and it is not a decision on your claim.
        </div>

        <div className="mt-8">
          <IntakeForm />
        </div>
      </main>

      <footer className="mx-auto max-w-3xl px-6 pb-10">
        <p className="border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
          Your description is used only to categorize this claim. Do not include
          payment card numbers or government identifiers.
        </p>
      </footer>
    </div>
  );
}
