import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertAdminKey } from "@/lib/adminAuth";
import { AdminUpload } from "@/components/admin-upload";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield } from "lucide-react";

type TeamRow = {
  id: string;
  name: string;
  captain_id: string | null;
  winrate?: number;
  record?: string;
  captain_name?: string | null;
  players: { player_id: string; is_substitute: boolean; nickname?: string }[];
  last_matches?: {
    id: string;
    vs: string;
    result: "W" | "L" | "D";
    score: string;
    date: string | null;
  }[];
};

type PlayerOption = { id: string; ingame_nickname: string | null };

async function getTeamsAndPlayers(): Promise<{ teams: TeamRow[]; playerOptions: PlayerOption[] }> {
  const [{ data: teams }, { data: teamPlayers }, { data: records }, { data: players }, { data: matches }] =
    await Promise.all([
      supabaseAdmin.from("teams").select("id,name,captain_id").order("name"),
      supabaseAdmin.from("team_players").select("team_id,player_id,is_substitute"),
      supabaseAdmin.rpc("get_team_records"),
      supabaseAdmin.from("players").select("id,ingame_nickname"),
      supabaseAdmin
        .from("matches")
        .select("id,team_1_id,team_2_id,winner_id,match_date,team_1_score,team_2_score")
        .order("match_date", { ascending: false }),
    ]);

  const nicknameMap = new Map<string, string>();
  (players ?? []).forEach((p) => nicknameMap.set(p.id, p.ingame_nickname ?? p.id));

  const teamNameMap = new Map<string, string>();
  (teams ?? []).forEach((t) => teamNameMap.set(t.id, t.name));

  const winrateMap = new Map<string, { winrate: number; record: string }>();
  (records ?? []).forEach((r: any) => {
    winrateMap.set(r.name, {
      winrate: Math.round((r.winrate ?? 0) * 100),
      record: `${r.wins ?? 0}W - ${r.losses ?? 0}L`,
    });
  });

  const teamsResult: TeamRow[] =
    (teams ?? []).map((t) => {
      const lastMatches =
        matches
          ?.filter((m) => m.team_1_id === t.id || m.team_2_id === t.id)
          .slice(0, 5)
          .map((m) => {
            const vsId = m.team_1_id === t.id ? m.team_2_id : m.team_1_id;
            const vsName = teamNameMap.get(vsId) ?? "—";
            const isWinner = m.winner_id === t.id;
            const isDraw = m.team_1_score === m.team_2_score;
            const score =
              m.team_1_id === t.id
                ? `${m.team_1_score ?? 0}-${m.team_2_score ?? 0}`
                : `${m.team_2_score ?? 0}-${m.team_1_score ?? 0}`;
            return {
              id: m.id,
              vs: vsName,
              result: isDraw ? "D" : isWinner ? "W" : "L",
              score,
              date: m.match_date,
            };
          }) ?? [];

      return {
        id: t.id,
        name: t.name,
        captain_id: t.captain_id,
        captain_name: t.captain_id ? nicknameMap.get(t.captain_id) ?? t.captain_id : null,
        winrate: winrateMap.get(t.name)?.winrate ?? 0,
        record: winrateMap.get(t.name)?.record ?? "0W - 0L",
        players: (teamPlayers ?? [])
          .filter((p) => p.team_id === t.id)
          .map((p) => ({
            player_id: p.player_id,
            is_substitute: p.is_substitute,
            nickname: nicknameMap.get(p.player_id),
          })),
        last_matches: lastMatches,
      };
    }) ?? [];

  const playerOptions: PlayerOption[] = (players ?? []).map((p) => ({
    id: p.id,
    ingame_nickname: p.ingame_nickname,
  }));

  return { teams: teamsResult, playerOptions };
}

async function createTeam(formData: FormData) {
  "use server";
  const adminKey = formData.get("adminKey")?.toString();
  assertAdminKey(adminKey);

  const name = formData.get("name")?.toString();
  const captain_id = formData.get("captain")?.toString() || null;
  const playersRaw = formData.getAll("players") ?? [];
  const subsRaw = formData.getAll("subs") ?? [];

  if (!name) throw new Error("name requis");

  const player_ids = (playersRaw as string[]).map((s) => s.trim()).filter(Boolean);
  const substitutes = (subsRaw as string[]).map((s) => s.trim()).filter(Boolean);

  const { data: team, error: teamErr } = await supabaseAdmin
    .from("teams")
    .insert({ name, captain_id })
    .select("id")
    .single();

  if (teamErr || !team) {
    throw new Error(teamErr?.message ?? "Erreur création équipe");
  }

  const rows = [
    ...player_ids.map((pid) => ({ team_id: team.id, player_id: pid, is_substitute: false })),
    ...substitutes.map((pid) => ({ team_id: team.id, player_id: pid, is_substitute: true })),
  ];

  if (rows.length > 0) {
    const { error: tpErr } = await supabaseAdmin.from("team_players").insert(rows);
    if (tpErr) throw new Error(tpErr.message);
  }

  await supabaseAdmin.from("news_feed").insert({
    type: "team_created",
    title: `Équipe créée: ${name}`,
    description: captain_id ? `Capitaine: ${captain_id}` : "Capitaine à définir",
    related_id: team.id,
  });

  await revalidatePath("/teams");
  await revalidatePath("/");
}

async function transferPlayer(formData: FormData) {
  "use server";
  const adminKey = formData.get("adminKey")?.toString();
  assertAdminKey(adminKey);

  const player_id = formData.get("player_id")?.toString();
  const to_team_id = formData.get("to_team_id")?.toString();
  const is_sub = formData.get("is_sub") === "on";
  const reason = formData.get("reason")?.toString();

  if (!player_id || !to_team_id) {
    throw new Error("player_id et to_team_id requis");
  }

  await supabaseAdmin.from("team_players").delete().eq("player_id", player_id);
  await supabaseAdmin.from("team_players").insert({
    team_id: to_team_id,
    player_id,
    is_substitute: is_sub,
  });
  await supabaseAdmin.from("news_feed").insert({
    type: "player_transfer",
    title: "Transfert joueur",
    description: `Player ${player_id} -> team ${to_team_id}${is_sub ? " (sub)" : ""}${reason ? ` — ${reason}` : ""}`,
    related_id: player_id,
  });
  await revalidatePath("/teams");
  await revalidatePath("/");
}

async function removePlayerFromTeam(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session?.admin) throw new Error("Admin requis");
  const player_id = formData.get("player_id")?.toString();
  if (!player_id) throw new Error("player_id requis");

  await supabaseAdmin.from("team_players").delete().eq("player_id", player_id);
  await revalidatePath("/teams");
  await revalidatePath("/");
}

async function setCaptain(formData: FormData) {
  "use server";
  const adminKey = formData.get("adminKey")?.toString();
  assertAdminKey(adminKey);

  const team_id = formData.get("team_id")?.toString();
  const captain_id = formData.get("captain_id")?.toString();
  if (!team_id || !captain_id) throw new Error("team_id et captain_id requis");

  await supabaseAdmin.from("teams").update({ captain_id }).eq("id", team_id);
  await revalidatePath("/teams");
  await revalidatePath("/");
}

export default async function TeamsPage() {
  const [{ teams, playerOptions }, session] = await Promise.all([getTeamsAndPlayers(), getSession()]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Équipes</p>
          <h1 className="text-3xl font-bold text-white">Rosters et winrates</h1>
          <p className="text-muted-foreground">
            CRUD équipes (admin) + affichage capitaine, logo, remplaçants.
          </p>
        </div>
        {session?.admin && (
          <Sheet>
            <SheetTrigger asChild>
              <Button>Créer une équipe (admin)</Button>
            </SheetTrigger>
            <SheetContent className="bg-slate-950 text-white">
              <SheetHeader>
                <SheetTitle>Nouvelle équipe</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  Formulaire admin — crée team + joueurs + news feed.
                </p>
              </SheetHeader>
              <div className="mt-4 text-sm text-muted-foreground">
                <form action={createTeam} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground">Nom</label>
                    <input
                      name="name"
                      className="w-full rounded-md bg-black/30 px-3 py-3 text-white"
                      placeholder="Nom d'équipe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground">Capitaine</label>
                    <select
                      name="captain"
                      className="w-full rounded-md bg-black/30 px-3 py-3 text-white"
                      defaultValue=""
                    >
                      <option value="">(optionnel)</option>
                      {playerOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.ingame_nickname ?? p.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground">Titulaire(s)</label>
                    <select
                      name="players"
                      multiple
                      size={6}
                      className="w-full rounded-md bg-black/30 px-3 py-3 text-white"
                    >
                      {playerOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.ingame_nickname ?? p.id}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">Ctrl/Cmd + clic pour multi-sélection.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground">Remplaçant(s)</label>
                    <select
                      name="subs"
                      multiple
                      size={4}
                      className="w-full rounded-md bg-black/30 px-3 py-3 text-white"
                    >
                      {playerOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.ingame_nickname ?? p.id}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">Optionnel — remplaçants.</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground">Clé admin</label>
                    <input
                      name="adminKey"
                      type="password"
                      className="w-full rounded-md bg-black/30 px-3 py-3 text-white"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full py-3 text-base">Créer</Button>
                </form>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {session?.admin && (
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Transfert joueur (admin)</CardTitle>
            <CardDescription className="text-slate-300">
              Déplace un joueur vers une équipe, avec news feed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={transferPlayer} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Player ID</label>
                    <select
                      name="player_id"
                      className="w-full rounded-md bg-black/30 px-3 py-2 text-white"
                      required
                    >
                      <option value="">Sélectionner</option>
                      {playerOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.ingame_nickname ?? p.id}
                        </option>
                      ))}
                    </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Team ID</label>
                    <select
                      name="to_team_id"
                      className="w-full rounded-md bg-black/30 px-3 py-2 text-white"
                      required
                    >
                      <option value="">Sélectionner</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Raison</label>
                <input
                  name="reason"
                  className="w-full rounded-md bg-black/30 px-3 py-2 text-white"
                  placeholder="optionnel"
                />
              </div>
              <div className="flex items-center gap-2">
                <input id="is_sub" name="is_sub" type="checkbox" className="h-4 w-4" />
                <label htmlFor="is_sub" className="text-sm text-muted-foreground">Substitute</label>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Clé admin</label>
                <input
                  name="adminKey"
                  type="password"
                  className="w-full rounded-md bg-black/30 px-3 py-2 text-white"
                  required
                />
              </div>
              <Button type="submit" className="w-full">Transférer</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="teams">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="teams">Équipes</TabsTrigger>
          <TabsTrigger value="players">Joueurs</TabsTrigger>
        </TabsList>
        <TabsContent value="teams" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {teams
              .slice()
              .sort((a, b) => (b.winrate ?? 0) - (a.winrate ?? 0))
              .map((team, idx) => (
              <Card key={team.name} className="border-white/10 bg-white/5 text-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">#{idx + 1}</Badge>
                        <CardTitle>{team.name}</CardTitle>
                      </div>
                      <CardDescription className="text-slate-300">
                        Capitaine : {team.captain_name ?? "à définir"}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{team.winrate}% WR</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">Joueurs</p>
                  <div className="space-y-1 text-sm">
                    {team.players.map((player) => (
                      <div
                        key={player.player_id}
                        className="flex items-center justify-between rounded-md border border-white/5 bg-black/20 px-3 py-2"
                      >
                        <span>
                          {player.nickname ?? "(sans pseudo)"} {player.is_substitute ? "(sub)" : ""}
                        </span>
                        {session?.admin && (
                          <form action={removePlayerFromTeam}>
                            <input type="hidden" name="player_id" value={player.player_id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              className="text-red-200 hover:text-red-100 hover:bg-red-500/10"
                            >
                              Retirer
                            </Button>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                  {team.last_matches && team.last_matches.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <p className="text-sm text-muted-foreground">Derniers matchs</p>
                      <div className="space-y-1 text-sm">
                        {team.last_matches.slice(0, 3).map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between rounded-md border border-white/5 bg-black/15 px-3 py-2"
                          >
                            <span className="text-xs text-muted-foreground">{m.date?.slice(0, 10) ?? ""}</span>
                            <span className="font-semibold">{m.result}</span>
                            <span className="text-muted-foreground">vs {m.vs}</span>
                            <span className="text-sm font-medium">{m.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="players" className="space-y-4">
          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Liste des joueurs
              </CardTitle>
              <CardDescription className="text-slate-300">
                Pseudos publics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {playerOptions.length === 0 && (
                <p className="text-muted-foreground">Aucun joueur</p>
              )}
              {playerOptions.map((p) => (
                <div key={p.id} className="rounded-md border border-white/5 bg-black/20 px-3 py-2">
                  {p.ingame_nickname ?? "(sans pseudo)"}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {session?.admin && (
        <AdminUpload
          title="Upload logo équipe (admin)"
          description="Bucket Supabase teams (jpg/png ≤5MB). Nécessite la clé admin."
          bucket="teams"
        />
      )}
    </div>
  );
}
