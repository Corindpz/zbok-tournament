import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Users, Newspaper, Swords, Trophy } from "lucide-react";

type NewsItem = { id: string; title: string; description: string; created_at: string };
type MatchItem = {
  id: string;
  team_1_id: string;
  team_2_id: string;
  match_date: string | null;
  winner_id: string | null;
  team_1_score: number | null;
  team_2_score: number | null;
  team_1_name?: string;
  team_2_name?: string;
};
type LeaderItem = { team: string; winrate: number; record: string };

async function getData() {
  let news: NewsItem[] | null = null;
  let matches: MatchItem[] | null = null;
  let teams: any[] | null = null;
  let teamNames: { id: string; name: string }[] | null = null;

  try {
    const results = await Promise.all([
      supabaseAdmin
        .from("news_feed")
        .select("id,title,description,created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("matches")
        .select("id,team_1_id,team_2_id,match_date,winner_id,team_1_score,team_2_score")
        .order("match_date", { ascending: true })
        .limit(5),
      supabaseAdmin.rpc("get_team_records"),
      supabaseAdmin.from("teams").select("id,name"),
    ]);

    news = results[0].data as any;
    matches = results[1].data as any;
    teams = (results[2] as any).data;
    teamNames = results[3].data as any;
  } catch (e) {
    news = news ?? [];
    matches = matches ?? [];
    teams = teams ?? [];
    teamNames = teamNames ?? [];
    console.error("[home/getData]", e);
  }

  const nameMap = new Map<string, string>();
  (teamNames ?? []).forEach((t) => nameMap.set(t.id, t.name ?? t.id));

  const matchesWithNames: MatchItem[] =
    (matches ?? []).map((m) => ({
      ...m,
      team_1_name: nameMap.get(m.team_1_id),
      team_2_name: nameMap.get(m.team_2_id),
    })) ?? [];

  const leaderboard: LeaderItem[] =
    teams?.map((t: any) => ({
      team: t.name ?? "Équipe",
      winrate: Math.round((t.winrate ?? 0) * 100),
      record: `${t.wins ?? 0}W - ${t.losses ?? 0}L`,
    })) ?? [];

  return {
    news: (news ?? []) as NewsItem[],
    matches: matchesWithNames,
    leaderboard,
  };
}

export default async function Home() {
  const { news, matches, leaderboard } = await getData();
  const statsQuick = {
    players: 0,
    teams: leaderboard.length,
    matchesPlayed: matches.filter((m) => m.winner_id).length,
    avgWinrate: leaderboard.length
      ? Math.round(
          leaderboard.reduce((acc, t) => acc + (t.winrate || 0), 0) / leaderboard.length
        )
      : 0,
  };
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">League of Legends</p>
          <h1 className="text-3xl font-bold text-white">Tournoi communautaire</h1>
          <p className="text-muted-foreground">
            Gestion des équipes, matchs, mercato, stats en temps réel via Supabase.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/auth">Se connecter</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/rules">Voir les règles</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Stats rapides</CardTitle>
            <CardDescription className="text-slate-300">Vue synthétique de la saison</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-3xl font-semibold">{statsQuick.players}</p>
              <p className="text-muted-foreground">Joueurs actifs</p>
            </div>
            <div>
              <p className="text-3xl font-semibold">{statsQuick.teams}</p>
              <p className="text-muted-foreground">Équipes</p>
            </div>
            <div>
              <p className="text-3xl font-semibold">{statsQuick.matchesPlayed}</p>
              <p className="text-muted-foreground">Matchs joués</p>
            </div>
            <div>
              <p className="text-3xl font-semibold">{statsQuick.avgWinrate}%</p>
              <p className="text-muted-foreground">Winrate moyen</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Newspaper className="h-4 w-4" /> News feed</CardTitle>
            <CardDescription className="text-slate-300">Dernières activités</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {news.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between rounded-md border border-white/5 bg-black/20 p-3"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Badge variant="outline">Live</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-4 w-4" /> Classement</CardTitle>
            <CardDescription className="text-slate-300">
              Winrate décroissant (calcul supabase)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaderboard.map((item, index) => (
              <div
                key={item.team}
                className="flex items-center justify-between rounded-md border border-white/5 bg-black/20 p-3"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">#{index + 1}</Badge>
                  <div>
                    <p className="font-semibold">{item.team}</p>
                    <p className="text-xs text-muted-foreground">{item.record}</p>
                  </div>
                </div>
                <p className="text-lg font-semibold">{item.winrate}%</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Swords className="h-4 w-4" /> Prochains matchs</CardTitle>
            <CardDescription className="text-slate-300">
              Création et résultats par les admins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="coming">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="coming">À venir</TabsTrigger>
                <TabsTrigger value="past">Derniers</TabsTrigger>
              </TabsList>
              <TabsContent value="coming" className="space-y-3">
                {matches
                  .filter((m) => !m.winner_id)
                  .map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between rounded-md border border-white/5 bg-black/20 p-3"
                  >
                    <div>
                      <p className="font-semibold">
                        {match.team_1_name ?? match.team_1_id} vs {match.team_2_name ?? match.team_2_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {match.match_date ? new Date(match.match_date).toLocaleString() : "Date à définir"} • BO3
                      </p>
                    </div>
                    <Badge variant="outline">Programmée</Badge>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="past">
                {matches
                  .filter((m) => !!m.winner_id)
                  .map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between rounded-md border border-white/5 bg-black/20 p-3"
                    >
                      <div>
                        <p className="font-semibold">
                          {match.team_1_name ?? match.team_1_id} vs {match.team_2_name ?? match.team_2_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {match.team_1_score ?? "?"} - {match.team_2_score ?? "?"}
                        </p>
                      </div>
                      <Badge variant="secondary">Terminé</Badge>
                    </div>
                  ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-primary/5 text-white">
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-primary">Mercato</p>
            <p className="text-xl font-semibold">Renouvellement mensuel</p>
            <p className="text-sm text-slate-300">
              Draft auto des capitaines + roue pour répartir les joueurs restants.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/mercato">Gérer le mercato</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/settings">Paramètres</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
