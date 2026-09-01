"use client";

import useSWR from "swr";
import {
  caseHandoffResponseSchema,
  type AdjusterReadyHandoff,
} from "@/lib/claims/handoff-schema";

type Props = { sessionToken: string | null; enabled: boolean; claimType?: string };

const WATER_DAMAGE = "water_damage";

const fetcher = async ([url, sessionToken]: [string, string]): Promise<AdjusterReadyHandoff> => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionToken }),
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("The next step could not be prepared. Please try again.");
  }

  const parsedResponse = caseHandoffResponseSchema.safeParse(data);
  if (!parsedResponse.success) {
    throw new Error("The next step could not be prepared. Please try again.");
  }
  if ("error" in parsedResponse.data) throw new Error(parsedResponse.data.error);
  if (!response.ok) throw new Error("The handoff could not be prepared.");
  return parsedResponse.data.handoff;
};

export function CaseHandoffPanel({ sessionToken, enabled, claimType }: Props) {
  const eligible = enabled && claimType === WATER_DAMAGE;
  const key = eligible && sessionToken ? (["/api/case-handoff", sessionToken] as const) : null;
  const { data, error, isLoading, mutate } = useSWR<AdjusterReadyHandoff>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });

  if (!enabled) return null;
  if (isLoading) {
    return <div role="status" className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Preparing your next step…</div>;
  }
  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        <p>{error.message}</p>
        <button type="button" onClick={() => void mutate()} className="mt-3 rounded-lg border border-destructive/30 bg-background px-3 py-2 font-medium text-foreground">Try again</button>
      </div>
    );
  }
  if (!data) return null;

  const handoff = data;
  const urgent = handoff.urgency.level === "urgent";
  return (
    <section aria-live="polite" className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Next step</p>
      <h2 className="mt-3 font-serif text-2xl font-semibold text-foreground text-balance">
        {urgent ? "Urgent human review" : handoff.finalDisposition === "property_adjuster_review" ? "Ready for property adjuster review" : "Human review recommended"}
      </h2>
      <p className="mt-2 leading-relaxed text-foreground text-pretty">{handoff.rationale}</p>
      <div className="mt-6 border-t border-border pt-5">
        <p className="text-sm font-medium text-foreground">Why</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">{handoff.urgency.rationale}</p>
        <p className="mt-4 text-sm font-medium text-foreground">Confirmed detail</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">{handoff.urgency.evidenceFact.value ?? "No safety detail was confirmed."}</p>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">This is preliminary operational guidance, not a coverage, fault, payment, or acceptance decision.</p>
      </div>
    </section>
  );
}
