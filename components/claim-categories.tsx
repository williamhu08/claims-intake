"use client";

/** Introduced in V0; presents the supported categories in the current V3 application. */

import { claimTypeOptions } from "@/lib/claims/display";

export function ClaimCategories() {
  return (
    <section className="category-panel border-y-2 border-foreground/50" aria-labelledby="categories-heading">
      <div className="px-6 py-4">
        <h2 id="categories-heading" className="font-serif text-xl font-semibold text-foreground text-balance">
          Supported claim categories
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
          These are the claim categories we support. We use the information you provide to suggest the closest match. If the incident is unclear, we&apos;ll say so rather than make assumptions.
        </p>
      </div>
      <div className="overflow-x-auto px-6 pb-6">
        <table className="w-full min-w-[32rem] border-collapse border-2 border-black text-left" aria-label="Supported claim categories">
          <thead>
            <tr className="border-b-2 border-black text-sm text-muted-foreground">
              <th scope="col" className="border-r-2 border-black px-4 py-3 font-medium">Category</th>
              <th scope="col" className="px-4 py-3 font-medium">What it covers</th>
            </tr>
          </thead>
          <tbody>
            {claimTypeOptions.map((category) => (
              <tr key={category.value} className="border-b border-border last:border-b-0">
                <th scope="row" className="border-r-2 border-black px-4 py-3 align-top text-sm font-medium text-foreground">{category.label}</th>
                <td className="px-4 py-3 text-sm leading-relaxed text-muted-foreground">{category.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
