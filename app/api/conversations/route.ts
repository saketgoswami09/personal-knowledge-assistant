import { NextResponse } from "next/server";
import { getConversations, createConversation } from "@/lib/supabase";
import { ValidationError } from "@/lib/errors";
import { handleApiError } from "@/lib/handle-api-error";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const convos = await getConversations(userId);
    return NextResponse.json(convos);
  } catch (err) {
    return handleApiError(err, "[GET /api/conversations]");
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title } = await req.json();
    if (!title) {
      throw new ValidationError(
        "POST /api/conversations: missing title field",
        "A conversation title is required."
      );
    }
    const convo = await createConversation(title, userId);
    return NextResponse.json(convo);
  } catch (err) {
    return handleApiError(err, "[POST /api/conversations]");
  }
}
