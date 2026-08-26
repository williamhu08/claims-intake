import { claimTypeOptions } from "@/lib/claims/display";

export function ClaimCategories() {
  return (
    <section className="border-y border-border" aria-labelledby="categories-heading">
      <details>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-foreground [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-sm font-medium text-accent">Possible categories</span>
            <span
              id="categories-heading"
              className="mt-1 block font-serif text-xl font-semibold text-foreground text-balance"
            >
              How we make an initial reading
            </span>
          </span>
          <span className="font-mono text-lg text-muted-foreground" aria-hidden="true">
            +
          </span>
        </summary>

        <div className="pb-6">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
            We use the information you provide to suggest the closest category. If the
            incident is unclear, we&apos;ll say so rather than make assumptions.
          </p>

          <ul className="mt-5 flex flex-col gap-3" aria-label="Possible claim categories">
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
      </details>
    </section>
  );
}
