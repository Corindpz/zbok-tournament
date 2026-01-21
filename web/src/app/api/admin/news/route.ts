import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertAdminKey } from "@/lib/adminAuth";

type NewsBody = {
  adminKey?: string;
  type: "match_result" | "player_transfer" | "team_created";
  title: string;
  description: string;
  related_id?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<NewsBody>;
    assertAdminKey(body.adminKey);

    const { type, title, description, related_id = null } = body;
    if (!type || !title || !description) {
      return NextResponse.json({ error: "type, title, description requis" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("news_feed").insert({
      type,
      title,
      description,
      related_id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e?.status ?? 500;
    const message = e?.message ?? "Erreur serveur";
    console.error("[admin/news]", e);
    return NextResponse.json({ error: message }, { status });
  }
}
