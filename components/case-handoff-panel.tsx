"use client";

import useSWR from "swr";
import type { AdjusterReadyHandoff } from "@/lib/claims/handoff-schema";

type Props = { sessionToken: string | null; enabled: boolean };

type ResponsePayload = { handoff?: AdjusterReadyHandoff; error?: string };

const fetcher = async ([url, sessionToken]: [string, string]): Promise<ResponsePayload> => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionToken }),
  });
  const data = (await response.json()) as ResponsePayload;
  if (response.status === 422) return {};
  if (!response.ok) throw new Error(data.error ?? "The handoff could not be prepared.");
  return data;
};

export function CaseHandoffPanel({ sessionToken, enabled }: Props) {
  const key = enabled && sessionToken ? (["/api/case-handoff", sessionToken] as const) : null;
  const { data, error, isLoading, mutate } = useSWR<ResponsePayload>(key, fetcher, {
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
  if (!data?.handoff) return null;

  const { handoff } = data;
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
