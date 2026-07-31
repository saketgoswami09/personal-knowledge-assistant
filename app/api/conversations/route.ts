import { NextResponse } from "next/server";
import { getConversations, createConversation } from "@/lib/supabase";
import { ValidationError } from "@/lib/errors";
import { handleApiError } from "@/lib/handle-api-error";

export const runtime = "nodejs";

export async function GET() {
  try {
    const convos = await getConversations();
    return NextResponse.json(convos);
  } catch (err) {
    return handleApiError(err, "[GET /api/conversations]");
  }
}

export async function POST(req: Request) {
  try {
    const { title } = await req.json();
    if (!title) {
      throw new ValidationError(
        "POST /api/conversations: missing title field",
        "A conversation title is required."
      );
    }
    const convo = await createConversation(title);
    return NextResponse.json(convo);
  } catch (err) {
    return handleApiError(err, "[POST /api/conversations]");
  }
}
