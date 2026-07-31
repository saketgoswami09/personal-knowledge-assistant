import { NextResponse } from "next/server";
import { getConversations, createConversation } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const convos = await getConversations();
    return NextResponse.json(convos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title } = await req.json();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const convo = await createConversation(title);
    return NextResponse.json(convo);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
