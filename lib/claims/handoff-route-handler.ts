/** Clearway version scope: V3. */
import { z } from "zod";

import { parseJsonRequest } from "@/lib/api/json-request";
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

/** Serializes request-validation failures through the V3 response schema. */
function handoffRequestErrorResponse(message: string, status: number): Response {
  return handoffJsonResponse({ error: message }, { status });
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
    const parsedRequest = await parseJsonRequest(
      request,
      handoffRequestSchema,
      "Send a JSON request with a case session token.",
      "Send a valid case session token.",
      handoffRequestErrorResponse,
    );
    if (!parsedRequest.success) {
      return parsedRequest.response;
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
