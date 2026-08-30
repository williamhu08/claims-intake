/** Clearway version scope: V2. */
import Link from "next/link";
import { AnswerTypeShowcase } from "@/components/answer-type-showcase";

export const metadata = {
  title: "Answer type showcase — Clearway",
};

export default function AnswerTypesPage() {
  const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-6 py-3">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary font-serif text-sm font-semibold text-primary-foreground" aria-hidden="true">CW</span>
          <span className="text-sm font-semibold tracking-tight text-foreground">Clearway</span>
          <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">Developer tool</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
        {isProduction ? (
          <p className="text-muted-foreground">This developer page is only available outside production.</p>
        ) : (
          <>
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Back to claim intake
            </Link>
            <h1 className="mt-4 font-serif text-3xl font-semibold leading-tight text-foreground text-balance sm:text-4xl">
              Clarification answer types
            </h1>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground text-pretty">
              Every clarification answer type the model can request, rendered here for visual review. A real
              claimant only ever sees the specific type a given question needs — this page is a developer
              reference, not part of the claim flow. Nothing entered here is saved or submitted.
            </p>
            <div className="mt-8">
              <AnswerTypeShowcase />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
