"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type DraftResult = {
  ok: boolean;
  error?: string;
  teams?: {
    team_id: string;
    name: string;
    captain: { id: string; ingame_nickname?: string | null };
    players: { player_id: string }[];
  }[];
};

export function MercatoRunner() {
  const [adminKey, setAdminKey] = useState("");
  const [numberOfTeams, setNumberOfTeams] = useState<number | "">("");
  const [result, setResult] = useState<DraftResult | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    if (!adminKey) return;
    if (numberOfTeams === "" || Number(numberOfTeams) <= 0) {
      setResult({ ok: false, error: "number_of_teams requis (>=1)" });
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/mercato/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey, number_of_teams: Number(numberOfTeams) }),
      });
      const json = await res.json();
      setResult(json);
    });
  };

  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardContent className="space-y-3 pt-6">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Clé admin</label>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            className="w-full rounded-md bg-black/30 px-3 py-2 text-white"
            placeholder="admin secret"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Nombre d'équipes</label>
          <input
            type="number"
            min={1}
            value={numberOfTeams}
            onChange={(e) => setNumberOfTeams(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-md bg-black/30 px-3 py-2 text-white"
            placeholder="ex: 4"
          />
        </div>
        <Button onClick={run} disabled={pending || !adminKey} className="w-full">
          {pending ? "Génération..." : "Lancer le mercato auto"}
        </Button>

        {result && !result.ok && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {result.error ?? "Erreur"}
          </div>
        )}

        {result?.ok && result.teams && (
          <div className="space-y-2 text-sm">
            <p className="text-xs uppercase text-muted-foreground">Résultat du tirage</p>
            {result.teams.map((t, idx) => (
              <div
                key={t.team_id}
                className="space-y-1 rounded-md border border-white/10 bg-black/20 px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">#{idx + 1}</Badge>
                    <span className="font-semibold">{t.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Capitaine: {t.captain.ingame_nickname ?? t.captain.id}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Joueurs: {t.players.map((p) => p.player_id).join(", ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
