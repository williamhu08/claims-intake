import { claimTypeOptions } from "@/lib/claims/display";

export function ClaimCategories() {
  return (
    <section className="border-t border-border pt-8 md:border-l md:border-t-0 md:pl-6 md:pt-1 lg:pl-8" aria-labelledby="categories-heading">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-accent">Possible categories</p>
        <h2
          id="categories-heading"
          className="mt-2 font-serif text-2xl font-semibold text-foreground text-balance"
        >
          How we make an initial reading
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          We use the information you provide to suggest the closest category. If the
          incident is unclear, we&apos;ll say so rather than make assumptions.
        </p>
      </div>

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
    </section>
  );
}
