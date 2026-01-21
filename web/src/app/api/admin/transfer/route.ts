import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertAdminKey } from "@/lib/adminAuth";

type TransferBody = {
  adminKey?: string;
  player_id: string;
  to_team_id: string;
  is_substitute?: boolean;
  reason?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<TransferBody>;
    assertAdminKey(body.adminKey);

    const { player_id, to_team_id, is_substitute = false, reason } = body;
    if (!player_id || !to_team_id) {
      return NextResponse.json({ error: "player_id et to_team_id requis" }, { status: 400 });
    }

    // Remove previous team assignation(s)
    await supabaseAdmin.from("team_players").delete().eq("player_id", player_id);

    // Insert new assignation
    const { error: insertErr } = await supabaseAdmin.from("team_players").insert({
      team_id: to_team_id,
      player_id,
      is_substitute,
    });
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e?.status ?? 500;
    const message = e?.message ?? "Erreur serveur";
    console.error("[admin/transfer]", e);
    return NextResponse.json({ error: message }, { status });
  }
}
