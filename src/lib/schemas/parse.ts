import { NextResponse } from "next/server";
import { ZodType } from "zod";

type ParseSuccess<T> = { success: true; data: T };
type ParseFailure = { success: false; response: NextResponse };

export async function parseJsonBody<T>(
  req: Request,
  schema: ZodType<T>
): Promise<ParseSuccess<T> | ParseFailure> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Invalid request body",
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: parsed.data };
}
