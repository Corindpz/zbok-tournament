import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertAdminKey } from "@/lib/adminAuth";

// Fisher–Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const res = [...arr];
  for (let i = res.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [res[i], res[j]] = [res[j], res[i]];
  }
  return res;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const adminKey = body?.adminKey as string | undefined;
    const overrideTeams = body?.number_of_teams as number | undefined;
    assertAdminKey(adminKey);

    // Read settings
    const { data: settings } = await supabaseAdmin
      .from("mercato_settings")
      .select("number_of_teams")
      .limit(1)
      .maybeSingle();

    const number_of_teams = overrideTeams ?? settings?.number_of_teams ?? 0;
    if (!number_of_teams || number_of_teams <= 0) {
      return NextResponse.json({ error: "number_of_teams non défini" }, { status: 400 });
    }

    // Fetch available players
    const { data: players, error: playersErr } = await supabaseAdmin
      .from("players")
      .select("id, ingame_nickname")
      .eq("is_inactive", false);

    if (playersErr) {
      return NextResponse.json({ error: playersErr.message }, { status: 400 });
    }

    if (!players || players.length < number_of_teams) {
      return NextResponse.json(
        { error: "Pas assez de joueurs disponibles pour le nombre d'équipes" },
        { status: 400 }
      );
    }

    const shuffled = shuffle(players);
    const captains = shuffled.slice(0, number_of_teams);
    const remaining = shuffled.slice(number_of_teams);

    // Ensure teams exist or create them
    const teamIds: string[] = [];
    for (let i = 0; i < number_of_teams; i += 1) {
      const teamName = `Mercato Team ${i + 1}`;
      const captain = captains[i];
      const { data: existing } = await supabaseAdmin
        .from("teams")
        .select("id")
        .eq("name", teamName)
        .maybeSingle();

      let teamId = existing?.id;
      if (!teamId) {
        const { data: created, error: createErr } = await supabaseAdmin
          .from("teams")
          .insert({ name: teamName, captain_id: captain.id })
          .select("id")
          .single();
        if (createErr || !created) {
          return NextResponse.json({ error: createErr?.message ?? "Erreur création équipe" }, { status: 400 });
        }
        teamId = created.id;
      } else {
        // Update captain
        await supabaseAdmin.from("teams").update({ captain_id: captain.id }).eq("id", teamId);
      }
      teamIds.push(teamId);

      // Reset roster
      await supabaseAdmin.from("team_players").delete().eq("team_id", teamId);
      await supabaseAdmin
        .from("team_players")
        .insert({ team_id: teamId, player_id: captain.id, is_substitute: false });
    }

    // Distribute remaining players round-robin
    const inserts: { team_id: string; player_id: string; is_substitute: boolean }[] = [];
    remaining.forEach((p, idx) => {
      const teamIndex = idx % number_of_teams;
      inserts.push({ team_id: teamIds[teamIndex], player_id: p.id, is_substitute: false });
    });

    if (inserts.length) {
      const { error: insertErr } = await supabaseAdmin.from("team_players").insert(inserts);
      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 400 });
      }
    }

    // News feed entry
    await supabaseAdmin.from("news_feed").insert({
      type: "team_created",
      title: "Mercato auto",
      description: `Tirage auto pour ${number_of_teams} équipes`,
      related_id: null,
    });

    return NextResponse.json({
      ok: true,
      teams: teamIds.map((id, i) => ({
        team_id: id,
        name: `Mercato Team ${i + 1}`,
        captain: captains[i],
        players: inserts.filter((r) => r.team_id === id),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur serveur" }, { status: 500 });
  }
}
