/** Clearway version scope: V3. */
import { createCaseHandoffRouteHandler } from "@/lib/claims/handoff-route-handler";

export const runtime = "nodejs";

/** Production V3 endpoint backed only by Clearway's source-controlled mock fixtures. */
export const POST = createCaseHandoffRouteHandler();
