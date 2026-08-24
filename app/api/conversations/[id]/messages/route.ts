import { NextResponse } from "next/server";
import { getMessages } from "@/lib/supabase";
import { handleApiError } from "@/lib/handle-api-error";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

// Next.js 15 requires async params access
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const messages = await getMessages(id, userId);
    return NextResponse.json(messages);
  } catch (err) {
    return handleApiError(err, "[GET /api/conversations/:id/messages]");
  }
}
