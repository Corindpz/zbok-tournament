import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertAdminKey } from "@/lib/adminAuth";

type CreateTeamBody = {
  adminKey?: string;
  name: string;
  captain_id?: string | null;
  player_ids?: string[]; // includes captain if provided
  substitutes?: string[];
  logo_url?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<CreateTeamBody>;
    assertAdminKey(body.adminKey);

    const { name, captain_id, player_ids = [], substitutes = [], logo_url = null } = body;
    if (!name) {
      return NextResponse.json({ error: "name requis" }, { status: 400 });
    }

    const { data: team, error: teamErr } = await supabaseAdmin
      .from("teams")
      .insert({
        name,
        captain_id: captain_id ?? null,
        logo_url,
      })
      .select("id")
      .single();

    if (teamErr || !team) {
      return NextResponse.json({ error: teamErr?.message ?? "Erreur création équipe" }, { status: 400 });
    }

    const rows = [
      ...player_ids.map((pid) => ({ team_id: team.id, player_id: pid, is_substitute: false })),
      ...substitutes.map((pid) => ({ team_id: team.id, player_id: pid, is_substitute: true })),
    ];

    if (rows.length > 0) {
      const { error: tpErr } = await supabaseAdmin.from("team_players").insert(rows);
      if (tpErr) {
        return NextResponse.json({ error: tpErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true, team_id: team.id });
  } catch (e: any) {
    const status = e?.status ?? 500;
    const message = e?.message ?? "Erreur serveur";
    console.error("[admin/team]", e);
    return NextResponse.json({ error: message }, { status });
  }
}
