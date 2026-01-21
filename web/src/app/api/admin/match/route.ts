import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertAdminKey } from "@/lib/adminAuth";

type MatchDetail = {
  player_id: string;
  champion_played?: string | null;
  damage_dealt?: number | null;
  kills?: number | null;
  deaths?: number | null;
  assists?: number | null;
};

type MatchBody = {
  adminKey?: string;
  team_1_id: string;
  team_2_id: string;
  match_date?: string;
  winner_id?: string | null;
  team_1_score?: number | null;
  team_2_score?: number | null;
  details?: MatchDetail[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<MatchBody>;
    assertAdminKey(body.adminKey);

    const { team_1_id, team_2_id, match_date, winner_id = null, team_1_score = null, team_2_score = null, details = [] } = body;

    if (!team_1_id || !team_2_id) {
      return NextResponse.json({ error: "team_1_id et team_2_id requis" }, { status: 400 });
    }

    const { data: match, error: matchErr } = await supabaseAdmin
      .from("matches")
      .insert({
        team_1_id,
        team_2_id,
        match_date: match_date ? new Date(match_date).toISOString() : null,
        winner_id,
        team_1_score,
        team_2_score,
      })
      .select("id")
      .single();

    if (matchErr || !match) {
      return NextResponse.json({ error: matchErr?.message ?? "Erreur création match" }, { status: 400 });
    }

    if (details.length > 0) {
      const rows = details.map((d) => ({
        match_id: match.id,
        player_id: d.player_id,
        champion_played: d.champion_played ?? null,
        damage_dealt: d.damage_dealt ?? null,
        kills: d.kills ?? null,
        deaths: d.deaths ?? null,
        assists: d.assists ?? null,
      }));
      const { error: detailErr } = await supabaseAdmin.from("match_details").insert(rows);
      if (detailErr) {
        return NextResponse.json({ error: detailErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true, match_id: match.id });
  } catch (e: any) {
    const status = e?.status ?? 500;
    const message = e?.message ?? "Erreur serveur";
    console.error("[admin/match]", e);
    return NextResponse.json({ error: message }, { status });
  }
}
