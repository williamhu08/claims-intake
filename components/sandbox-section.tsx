"use client";

import Link from "next/link";
import { useTestingMode } from "@/components/app-shell";

/**
 * Collapsible "Sandbox" panel of developer-only links, rendered at the bottom
 * of the claim intake page. Only visible while Testing mode is on (and never
 * in production) — it links out to pages like the answer-type showcase that
 * are not part of the real claim flow.
 */
export function SandboxSection({ isProduction }: { isProduction: boolean }) {
  const testingMode = useTestingMode();

  if (isProduction || !testingMode) return null;

  return (
    <details className="group mt-10 rounded-lg border border-border bg-muted/40 open:bg-muted/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-foreground select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
        <span>Sandbox</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180"
        >
          <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="border-t border-border px-4 py-4">
        <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
          Developer tools for exercising parts of the intake flow outside a real claim submission.
        </p>
        <ul className="mt-3 space-y-2">
          <li>
            <Link
              href="/testing/answer-types"
              className="text-sm font-medium text-foreground underline underline-offset-4 transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              View answer type examples
            </Link>
          </li>
        </ul>
      </div>
    </details>
  );
}
