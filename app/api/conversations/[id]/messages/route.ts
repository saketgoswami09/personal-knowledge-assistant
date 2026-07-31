import { NextResponse } from "next/server";
import { getMessages } from "@/lib/supabase";

export const runtime = "nodejs";

// Next.js 15 requires async params access
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const messages = await getMessages(id);
    return NextResponse.json(messages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
