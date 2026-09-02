"use client";

/** Introduced in V0; presents the supported categories in the current V3 application. */

import { useState } from "react";
import { claimTypeOptions } from "@/lib/claims/display";

export function ClaimCategories() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section className="category-panel border-y-2 border-foreground/50" aria-labelledby="categories-heading">
      <button type="button" className="flex w-full items-start justify-between gap-4 px-6 py-4 text-left text-foreground" aria-expanded={isOpen} aria-controls="categories-content" onClick={() => setIsOpen((open) => !open)}>
        <span>
          <span id="categories-heading" className="block font-serif text-xl font-semibold text-foreground text-balance">Supported claim categories</span>
          {!isOpen && <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">Click to see the claim categories we support.</span>}
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-4 border-[var(--circle-border)] font-mono text-lg leading-none text-[var(--circle-border)]" aria-hidden="true">{isOpen ? "−" : "+"}</span>
      </button>
      <div id="categories-content" className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`} aria-hidden={!isOpen}>
        <div className="min-h-0 overflow-hidden">
          <div className="px-6 pb-6">
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">These are the claim categories we support. We use the information you provide to suggest the closest match. If the incident is unclear, we&apos;ll say so rather than make assumptions.</p>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[32rem] border-collapse border-2 border-black text-left" aria-label="Supported claim categories">
                <thead><tr className="border-b-2 border-black text-sm text-muted-foreground"><th scope="col" className="border-r-2 border-black px-4 py-3 font-medium">Category</th><th scope="col" className="px-4 py-3 font-medium">What it covers</th></tr></thead>
                <tbody>{claimTypeOptions.map((category) => <tr key={category.value} className="border-b border-border last:border-b-0"><th scope="row" className="border-r-2 border-black px-4 py-3 align-top text-sm font-medium text-foreground">{category.label}</th><td className="px-4 py-3 text-sm leading-relaxed text-muted-foreground">{category.description}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
