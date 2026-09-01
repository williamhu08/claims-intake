import { signCaseSession } from "@/lib/claims/session-engine";
import { caseSessionResponseSchema, type CaseSessionState } from "@/lib/claims/session-schema";

/** Validates, signs, and serializes the session returned to the browser. */
export function signedCaseSessionJsonResponse(
  session: CaseSessionState,
  signingSecret: string,
): Response {
  const sessionToken = signCaseSession(session, signingSecret);
  return Response.json(caseSessionResponseSchema.parse({ session, sessionToken }));
}
