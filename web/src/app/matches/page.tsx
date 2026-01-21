import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertAdminKey } from "@/lib/adminAuth";
import { revalidatePath } from "next/cache";
import { fetchChampions } from "@/lib/riot";
import { getSession } from "@/lib/session";

type TeamOption = { id: string; name: string };
type PlayerOption = { id: string; ingame_nickname: string | null };
type ChampionOption = { id: string; image: string };

type MatchRow = {
  id: string;
  team_1_id: string;
  team_2_id: string;
  match_date: string | null;
  winner_id: string | null;
  team_1_score: number | null;
  team_2_score: number | null;
  team_1_name?: string;
  team_2_name?: string;
  details?: {
    player_id: string;
    champion_played: string | null;
    kills: number | null;
    deaths: number | null;
    assists: number | null;
    nickname?: string | null;
    image?: string;
  }[];
};

async function getMatches(): Promise<{
  matches: MatchRow[];
  teams: TeamOption[];
  players: PlayerOption[];
  champs: ChampionOption[];
}> {
  const [{ data: matches }, { data: teams }, { data: details }, { data: players }, champs] = await Promise.all([
    supabaseAdmin
      .from("matches")
      .select("id,team_1_id,team_2_id,match_date,winner_id,team_1_score,team_2_score")
      .order("match_date", { ascending: false }),
    supabaseAdmin.from("teams").select("id,name"),
    supabaseAdmin.from("match_details").select("match_id,player_id,champion_played,kills,deaths,assists"),
    supabaseAdmin.from("players").select("id,ingame_nickname"),
    fetchChampions().catch(() => []),
  ]);

  const nameMap = new Map<string, string>();
  (teams ?? []).forEach((t) => nameMap.set(t.id, t.name ?? t.id));
  const nicknameMap = new Map<string, string>();
  (players ?? []).forEach((p) => nicknameMap.set(p.id, p.ingame_nickname ?? p.id));
  const champMap = new Map<string, string>();
  (champs ?? []).forEach((c: any) => champMap.set(c.id, c.image));

  const mappedMatches: MatchRow[] =
    (matches ?? []).map((m) => ({
      ...m,
      team_1_name: nameMap.get(m.team_1_id),
      team_2_name: nameMap.get(m.team_2_id),
      details: (details ?? [])
        .filter((d) => d.match_id === m.id)
        .map((d) => ({
          player_id: d.player_id,
          champion_played: d.champion_played,
          kills: d.kills,
          deaths: d.deaths,
          assists: d.assists,
          nickname: nicknameMap.get(d.player_id),
          image: d.champion_played ? champMap.get(d.champion_played) : undefined,
        })),
    })) ?? [];

  return {
    matches: mappedMatches,
    teams: (teams ?? []).map((t) => ({ id: t.id, name: t.name })),
    players: (players ?? []).map((p) => ({ id: p.id, ingame_nickname: p.ingame_nickname })),
    champs: (champs ?? []).map((c: any) => ({ id: c.id, image: c.image })),
  };
}

async function addMatchDetail(formData: FormData) {
  "use server";
  const adminKey = formData.get("adminKey")?.toString();
  assertAdminKey(adminKey);

  const match_id = formData.get("match_id")?.toString();
  const player_id = formData.get("player_id")?.toString();
  const champion_played = formData.get("champion")?.toString() || null;
  const kills = formData.get("kills") ? Number(formData.get("kills")) : null;
  const deaths = formData.get("deaths") ? Number(formData.get("deaths")) : null;
  const assists = formData.get("assists") ? Number(formData.get("assists")) : null;

  if (!match_id || !player_id) {
    throw new Error("match_id et player_id requis");
  }

  await supabaseAdmin.from("match_details").insert({
    match_id,
    player_id,
    champion_played,
    kills,
    deaths,
    assists,
  });

  await revalidatePath("/matches");
  await revalidatePath("/");
}

async function createMatch(formData: FormData) {
  "use server";
  const adminKey = formData.get("adminKey")?.toString();
  assertAdminKey(adminKey);

  const team_1_id = formData.get("team1")?.toString();
  const team_2_id = formData.get("team2")?.toString();
  const match_date = formData.get("date")?.toString() || undefined;
  const team_1_score = formData.get("score1") ? Number(formData.get("score1")) : null;
  const team_2_score = formData.get("score2") ? Number(formData.get("score2")) : null;

  if (!team_1_id || !team_2_id) {
    throw new Error("team_1_id et team_2_id requis");
  }

  await supabaseAdmin.from("matches").insert({
    team_1_id,
    team_2_id,
    match_date: match_date ? new Date(match_date).toISOString() : null,
    team_1_score,
    team_2_score,
  });

  await revalidatePath("/matches");
}

export default async function MatchesPage() {
  const [{ matches, teams, players, champs }, session] = await Promise.all([
    getMatches(),
    getSession(),
  ]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Matchs</p>
        <h1 className="text-3xl font-bold text-white">Planning & résultats</h1>
        <p className="text-muted-foreground">
          Les admins créent les matchs, saisissent les résultats et les détails des joueurs (champion, K/D/A).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Liste des matchs</CardTitle>
            <CardDescription className="text-slate-300">Passés et à venir</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {matches.map((match) => (
              <div
                key={match.id}
                className="rounded-md border border-white/5 bg-black/20 p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      {match.team_1_name ?? match.team_1_id} vs {match.team_2_name ?? match.team_2_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {match.match_date ? new Date(match.match_date).toLocaleString() : "Date à définir"}
                    </p>
                  </div>
                  <Badge variant={match.winner_id ? "secondary" : "outline"}>
                    {match.winner_id ? "Terminé" : "Programmé"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Score : {match.team_1_score ?? "?"} - {match.team_2_score ?? "?"}
                </p>
                {match.details && match.details.length > 0 && (
                  <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                    {match.details.map((d, idx) => (
                      <div key={`${d.player_id}-${idx}`} className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1">
                        {d.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={d.image}
                            alt={d.champion_played ?? "champion"}
                            className="h-6 w-6 rounded-sm border border-white/10 object-cover"
                          />
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-white/10 text-[10px] text-white">
                            ?
                          </span>
                        )}
                        <span className="font-medium text-white">{d.nickname ?? d.player_id}</span>
                        <span className="text-muted-foreground">{d.champion_played ?? "?"}</span>
                        <span className="text-muted-foreground">
                          K/D/A: {d.kills ?? "-"} / {d.deaths ?? "-"} / {d.assists ?? "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {session?.admin && (
          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle>Créer / mettre à jour (admin)</CardTitle>
              <CardDescription className="text-slate-300">
                Connecter aux tables `matches` et `match_details`
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form action={createMatch} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="team1">Équipe 1</Label>
                  <select
                    id="team1"
                    name="team1"
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
                <div className="space-y-2">
                  <Label htmlFor="team2">Équipe 2</Label>
                  <select
                    id="team2"
                    name="team2"
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="score1">Score équipe 1</Label>
                    <Input id="score1" name="score1" type="number" min={0} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="score2">Score équipe 2</Label>
                    <Input id="score2" name="score2" type="number" min={0} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date du match</Label>
                  <Input id="date" name="date" type="datetime-local" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminKey">Clé admin</Label>
                  <Input id="adminKey" name="adminKey" type="password" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="details">Détails (champions, K/D/A)</Label>
                  <Textarea id="details" name="details" placeholder="(non branché ici)" />
                </div>
                <Button className="w-full" type="submit">Enregistrer</Button>
              </form>

              <div className="h-px w-full bg-white/10" />

              <form action={addMatchDetail} className="space-y-3">
                <p className="text-sm font-semibold text-white">Ajouter un match_detail (admin)</p>
                <div className="space-y-2">
                  <Label htmlFor="match_id">Match ID</Label>
                  <select
                    id="match_id"
                    name="match_id"
                    className="w-full rounded-md bg-black/30 px-3 py-2 text-white"
                    required
                  >
                    <option value="">Sélectionner</option>
                    {matches.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.team_1_name ?? m.team_1_id} vs {m.team_2_name ?? m.team_2_id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player_id">Player ID</Label>
                  <select
                    id="player_id"
                    name="player_id"
                    className="w-full rounded-md bg-black/30 px-3 py-2 text-white"
                    required
                  >
                    <option value="">Sélectionner</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.ingame_nickname ?? p.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="champion">Champion</Label>
                    <select
                      id="champion"
                      name="champion"
                      className="w-full rounded-md bg-black/30 px-3 py-2 text-white"
                    >
                      <option value="">(optionnel)</option>
                      {champs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kills">Kills</Label>
                    <Input id="kills" name="kills" type="number" min={0} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deaths">Deaths</Label>
                    <Input id="deaths" name="deaths" type="number" min={0} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assists">Assists</Label>
                    <Input id="assists" name="assists" type="number" min={0} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminKeyDetail">Clé admin</Label>
                  <Input id="adminKeyDetail" name="adminKey" type="password" required />
                </div>
                <Button className="w-full" type="submit">Ajouter detail</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
