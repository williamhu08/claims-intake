"use client";

/** Clearway version scope: V0. */

import { useState } from "react";
import { claimTypeOptions } from "@/lib/claims/display";

export function ClaimCategories() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section
      className="category-panel border-y-2 border-foreground/50 transition-colors duration-200 hover:border-foreground/70"
      aria-labelledby="categories-heading"
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 px-6 py-4 text-left text-foreground"
        aria-expanded={isOpen}
        aria-controls="categories-content"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>
          <span
            id="categories-heading"
            className="block font-serif text-xl font-semibold text-foreground text-balance"
          >
            Supported claim categories
          </span>
          {!isOpen && (
            <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
              Click to see the claim categories we support.
            </span>
          )}
        </span>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-4 border-[var(--circle-border)] font-mono text-lg leading-none text-[var(--circle-border)] transition-colors hover:bg-muted"
          aria-hidden="true"
        >
          {isOpen ? "−" : "+"}
        </span>
      </button>

      <div
        id="categories-content"
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-6 pb-6">
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
              These are the claim categories we support. We use the information you provide
              to suggest the closest match. If the incident is unclear, we&apos;ll say so rather
              than make assumptions.
            </p>

            <ul className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="Possible claim categories">
              {claimTypeOptions.map((category) => (
                <li key={category.value} className="rounded-lg border border-border bg-card p-4">
                  <h3 className="text-sm font-medium text-foreground">{category.label}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {category.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
