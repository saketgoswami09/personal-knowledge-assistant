import { NextResponse } from "next/server";
import { getMessages } from "@/lib/supabase";
import { handleApiError } from "@/lib/handle-api-error";

export const runtime = "nodejs";

// Next.js 15 requires async params access
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const messages = await getMessages(id);
    return NextResponse.json(messages);
  } catch (err) {
    return handleApiError(err, "[GET /api/conversations/:id/messages]");
  }
}
