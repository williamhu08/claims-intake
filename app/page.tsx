import { AppShell } from "@/components/app-shell";
import { ClaimCategories } from "@/components/claim-categories";
import { ClaimIntakeSection } from "@/components/claim-intake-section";

export default function Home() {
  return (
    <div className="min-h-dvh">
      <AppShell isProduction={process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"}>
        <main className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Claim triage</p>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Property claims</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-foreground text-balance sm:text-4xl">Tell us what happened, and we&apos;ll route it for you.</h1>
            <p className="mt-3 leading-relaxed text-muted-foreground text-pretty">Describe the incident in your own words. We provide an instant initial reading of the claim category so it reaches the right team faster.</p>
          </div>
          <div role="note" className="mt-6 rounded-lg border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground text-pretty">This is an early triage assessment only. It does not determine coverage, liability, fault, or payment, and it is not a decision on your claim.</div>
          <div className="mt-8"><ClaimCategories /><div className="mt-10"><ClaimIntakeSection /></div></div>
        </main>
      </AppShell>

      <footer className="mx-auto max-w-3xl px-6 pb-10">
        <p className="border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
          Your description is used only to categorize this claim. Do not include
          payment card numbers or government identifiers.
        </p>
      </footer>
    </div>
  );
}
