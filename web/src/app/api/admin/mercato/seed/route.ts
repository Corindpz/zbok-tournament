import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertAdminKey } from "@/lib/adminAuth";

const NAMES = ["luka", "paul", "eliott", "kheir", "mael", "mario", "romain", "yulan", "shakil", "idris", "erwan"];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const adminKey = body?.adminKey as string | undefined;
    assertAdminKey(adminKey);

    // Existing players with those nicknames
    const { data: existing } = await supabaseAdmin
      .from("players")
      .select("id, ingame_nickname")
      .in("ingame_nickname", NAMES);

    const existingNames = new Set((existing ?? []).map((p) => p.ingame_nickname ?? ""));
    const toInsert = NAMES.filter((n) => !existingNames.has(n)).map((name) => ({
      ingame_nickname: name,
      is_inactive: false,
    }));

    if (toInsert.length) {
      const { error: insertErr } = await supabaseAdmin.from("players").insert(toInsert);
      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 400 });
      }
    }

    // Create two test teams and distribute players
    const teamNames = ["Test Alpha", "Test Beta"];
    const teamIds: string[] = [];
    for (const name of teamNames) {
      const { data: existingTeam } = await supabaseAdmin.from("teams").select("id").eq("name", name).maybeSingle();
      if (existingTeam?.id) {
        teamIds.push(existingTeam.id);
      } else {
        const { data: created, error } = await supabaseAdmin.from("teams").insert({ name }).select("id").single();
        if (error || !created) {
          return NextResponse.json({ error: error?.message ?? "Erreur création team" }, { status: 400 });
        }
        teamIds.push(created.id);
      }
    }

    // Reload players list (now includes inserts)
    const { data: allPlayers, error: reloadErr } = await supabaseAdmin
      .from("players")
      .select("id, ingame_nickname")
      .in("ingame_nickname", NAMES)
      .order("ingame_nickname");
    if (reloadErr) {
      return NextResponse.json({ error: reloadErr.message }, { status: 400 });
    }

    // Clear existing mappings for these teams
    for (const tid of teamIds) {
      await supabaseAdmin.from("team_players").delete().eq("team_id", tid);
    }

    const rows: { team_id: string; player_id: string; is_substitute: boolean }[] = [];
    (allPlayers ?? []).forEach((p, idx) => {
      const teamIndex = idx % teamIds.length;
      rows.push({ team_id: teamIds[teamIndex], player_id: p.id, is_substitute: false });
    });

    if (rows.length) {
      const { error: mapErr } = await supabaseAdmin.from("team_players").insert(rows);
      if (mapErr) {
        return NextResponse.json({ error: mapErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true, players: allPlayers, teams: teamIds });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur serveur" }, { status: 500 });
  }
}
