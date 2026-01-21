import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("players")
      .select("id, ingame_nickname, is_inactive, inactive_reason")
      .eq("is_inactive", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      players: data?.map((p) => ({
        id: p.id,
        name: p.ingame_nickname ?? "(sans pseudo)",
        inactive_reason: p.inactive_reason ?? null,
      })) ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur serveur" }, { status: 500 });
  }
}
