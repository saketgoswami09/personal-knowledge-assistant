import { NextResponse } from "next/server";
import { deleteConversation } from "@/lib/supabase";
import { handleApiError } from "@/lib/handle-api-error";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteConversation(id, userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, "[DELETE /api/conversations/:id]");
  }
}
