/** Clearway version scope: V3. */
import { z } from "zod";

import {
  V3HandoffEligibilityError,
  buildAdjusterReadyHandoff,
  mockWaterPolicyFixtures,
} from "@/lib/claims/handoff-engine";
import {
  caseHandoffResponseSchema,
  type MockPolicyFixture,
} from "@/lib/claims/handoff-schema";
import { getCaseSessionConfig } from "@/lib/claims/session-config";
import { verifyCaseSession } from "@/lib/claims/session-engine";
import type { CaseSessionState } from "@/lib/claims/session-schema";

const handoffRequestSchema = z.object({
  sessionToken: z.string().trim().min(1),
});

/** Serializes only a schema-valid exclusive handoff-or-error response. */
function handoffJsonResponse(payload: unknown, init?: ResponseInit): Response {
  return Response.json(caseHandoffResponseSchema.parse(payload), init);
}

/**
 * Creates a deterministic V3 request handler using a server-selected fixture registry.
 * The factory is a test seam only: production imports it with the immutable
 * source-controlled registry, and request bodies never select fixture data.
 */
export function createCaseHandoffRouteHandler(
  fixtures: readonly MockPolicyFixture[] = mockWaterPolicyFixtures,
) {
  /**
   * Returns a deterministic V3 handoff for one signed, terminal V2 session.
   * The browser supplies only the signed token; verification and all handoff
   * decisions remain on the server.
   */
  return async function handleCaseHandoff(request: Request) {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return handoffJsonResponse({ error: "Send a JSON request with a case session token." }, { status: 400 });
    }

    const parsedRequest = handoffRequestSchema.safeParse(body);

    if (!parsedRequest.success) {
      return handoffJsonResponse(
        { error: parsedRequest.error.issues[0]?.message ?? "Send a valid case session token." },
        { status: 400 },
      );
    }

    let config: ReturnType<typeof getCaseSessionConfig>;

    try {
      config = getCaseSessionConfig();
    } catch {
      return handoffJsonResponse({ error: "Case handoff is not configured for this environment." }, { status: 503 });
    }

    let session: CaseSessionState;

    try {
      session = verifyCaseSession(parsedRequest.data.sessionToken, config.signingSecret);
    } catch {
      return handoffJsonResponse(
        { error: "This case session is invalid or has expired. Start again to continue." },
        { status: 409 },
      );
    }

    try {
      return handoffJsonResponse({ handoff: buildAdjusterReadyHandoff(session, fixtures) });
    } catch (error) {
      if (error instanceof V3HandoffEligibilityError) {
        return handoffJsonResponse(
          { error: "This case is not eligible for the water-damage handoff. A person can review it instead." },
          { status: 422 },
        );
      }

      console.error("Case handoff failed", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return handoffJsonResponse(
        { error: "The case handoff could not be prepared. Please try again later." },
        { status: 500 },
      );
    }
  };
}
