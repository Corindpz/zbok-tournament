import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertAdminKey } from "@/lib/adminAuth";

type TeamInput = {
  name?: string;
  captain_id: string;
  player_ids: string[];
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const adminKey = body?.adminKey as string | undefined;
    const teams = body?.teams as TeamInput[] | undefined;
    assertAdminKey(adminKey);

    if (!teams || teams.length === 0) {
      return NextResponse.json({ error: "teams manquant" }, { status: 400 });
    }

    const results: { team_id: string; name: string }[] = [];

    for (let i = 0; i < teams.length; i += 1) {
      const t = teams[i];
      if (!t.captain_id) {
        return NextResponse.json({ error: "captain_id manquant" }, { status: 400 });
      }
      const roster = Array.from(new Set([t.captain_id, ...(t.player_ids ?? [])]));
      const name = t.name || `Mercato Team ${i + 1}`;

      const { data: teamRow, error: upsertErr } = await supabaseAdmin
        .from("teams")
        .upsert({ name, captain_id: t.captain_id }, { onConflict: "name" })
        .select("id")
        .single();

      if (upsertErr || !teamRow) {
        return NextResponse.json(
          { error: upsertErr?.message ?? "Erreur création équipe" },
          { status: 400 }
        );
      }

      const team_id = teamRow.id;
      // Reset roster
      await supabaseAdmin.from("team_players").delete().eq("team_id", team_id);
      if (roster.length) {
        const rows = roster.map((pid, idx) => ({
          team_id,
          player_id: pid,
          is_substitute: false,
        }));
        const { error: insertErr } = await supabaseAdmin.from("team_players").insert(rows);
        if (insertErr) {
          return NextResponse.json({ error: insertErr.message }, { status: 400 });
        }
      }

      results.push({ team_id, name });
    }

    await supabaseAdmin.from("news_feed").insert({
      type: "team_created",
      title: "Mercato validé",
      description: `${teams.length} équipes générées`,
      related_id: null,
    });

    return NextResponse.json({ ok: true, teams: results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur serveur" }, { status: 500 });
  }
}
