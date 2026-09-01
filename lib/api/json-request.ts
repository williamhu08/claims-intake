import type { ZodType } from "zod";

type JsonErrorResponseFactory = (message: string, status: number) => Response;

/**
 * Reads and validates one JSON request body while preserving route-specific
 * error copy. A custom factory can enforce a route's response schema.
 */
export async function parseJsonRequest<T>(
  request: Request,
  schema: ZodType<T>,
  malformedJsonMessage: string,
  invalidRequestMessage: string,
  createErrorResponse: JsonErrorResponseFactory = (message, status) =>
    Response.json({ error: message }, { status }),
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { success: false, response: createErrorResponse(malformedJsonMessage, 400) } as const;
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? invalidRequestMessage;
    return { success: false, response: createErrorResponse(message, 400) } as const;
  }

  return { success: true, data: parsed.data } as const;
}
