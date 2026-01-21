"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Player = { id: string; name: string };
type TeamLocal = { name: string; captain?: Player; players: Player[] };

function shuffle<T>(arr: T[]): T[] {
  const res = [...arr];
  for (let i = res.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [res[i], res[j]] = [res[j], res[i]];
  }
  return res;
}

export function MercatoStepper() {
  const [adminKey, setAdminKey] = useState("");
  const [numberOfTeams, setNumberOfTeams] = useState<number | "">("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [remaining, setRemaining] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamLocal[]>([]);
  const [lastAssigned, setLastAssigned] = useState<Player | null>(null);
  const [step, setStep] = useState<"idle" | "captains" | "assign" | "done">("idle");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assignIndex, setAssignIndex] = useState(0);
  const [removalHint, setRemovalHint] = useState<string | null>(null);

  const canAssign = useMemo(() => remaining.length > 0 && step === "assign", [remaining, step]);

  const loadPlayers = async () => {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/mercato/available");
    const json = await res.json();
    const list: Player[] = (json.players ?? []).map((p: any) => ({
      id: p.id,
      name: p.name ?? "(sans pseudo)",
    }));
    setPlayers(list);
    setRemaining(list);
    setTeams([]);
    setStep("idle");
    setAssignIndex(0);
    setLastAssigned(null);
  };

  const pickCaptains = () => {
    setError(null);
    setMessage(null);
    if (numberOfTeams === "" || Number(numberOfTeams) <= 0) {
      setError("Choisis un nombre d'équipes (>=1)");
      return;
    }
    if (players.length < Number(numberOfTeams)) {
      setError("Pas assez de joueurs pour tirer les capitaines");
      return;
    }
    const shuffled = shuffle(players);
    const caps = shuffled.slice(0, Number(numberOfTeams));
    const rest = shuffled.slice(Number(numberOfTeams));
    const teamsLocal: TeamLocal[] = caps.map((c, idx) => ({
      name: `Mercato Team ${idx + 1}`,
      captain: c,
      players: [],
    }));
    setTeams(teamsLocal);
    setRemaining(rest);
    setStep("assign");
    setAssignIndex(0);
    setLastAssigned(null);
  };

  const assignNext = () => {
    if (!canAssign) return;
    const rndIdx = Math.floor(Math.random() * remaining.length);
    const player = remaining[rndIdx];
    const newRemaining = [...remaining];
    newRemaining.splice(rndIdx, 1);
    const targetIndex = assignIndex % teams.length;
    const newTeams = teams.map((t, idx) =>
      idx === targetIndex ? { ...t, players: [...t.players, player] } : t
    );
    setTeams(newTeams);
    setRemaining(newRemaining);
    setAssignIndex(targetIndex + 1);
    setLastAssigned(player);
    if (newRemaining.length === 0) setStep("done");
  };

  const resetFlow = () => {
    setTeams([]);
    setRemaining(players);
    setStep("idle");
    setAssignIndex(0);
    setLastAssigned(null);
    setMessage(null);
    setError(null);
    setRemovalHint(null);
  };

  const removePlayer = (teamIdx: number, playerId: string) => {
    setTeams((prev) =>
      prev.map((t, idx) => {
        if (idx !== teamIdx) return t;
        return { ...t, players: t.players.filter((p) => p.id !== playerId) };
      })
    );
    const found = teams[teamIdx]?.players.find((p) => p.id === playerId);
    if (found) {
      setRemaining((prev) => [...prev, found]);
      setRemovalHint(`${found.name} remis dans la pile`);
      setStep("assign");
    }
  };

  const save = async () => {
    setError(null);
    setMessage(null);
    if (!adminKey) {
      setError("Clé admin requise");
      return;
    }
    if (teams.length === 0) {
      setError("Aucune équipe tirée");
      return;
    }
    setSaving(true);
    const payload = {
      adminKey,
      teams: teams.map((t) => ({
        name: t.name,
        captain_id: t.captain?.id,
        player_ids: [t.captain?.id, ...t.players.map((p) => p.id)].filter(Boolean),
      })),
    };
    const res = await fetch("/api/admin/mercato/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Erreur lors de la sauvegarde");
    } else {
      setMessage("Mercato sauvegardé en base");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>Tirage étape par étape</CardTitle>
          <CardDescription className="text-slate-300">
            1) Tirer les capitaines, 2) Assigner les joueurs un par un, 3) Sauvegarder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
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
            <div className="space-y-1 flex items-end">
              <Button onClick={loadPlayers} className="w-full">Charger joueurs</Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>Joueurs chargés : {players.length}</span>
            <span>Restants : {remaining.length}</span>
            <span>Étape : {step}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={pickCaptains} disabled={players.length === 0}>Tirer les capitaines</Button>
            <Button onClick={assignNext} disabled={!canAssign}>Assigner un joueur</Button>
            <Button variant="outline" onClick={save} disabled={saving || teams.length === 0}>
              {saving ? "Sauvegarde..." : "Sauvegarder en base"}
            </Button>
            <Button variant="ghost" onClick={resetFlow}>Reset</Button>
          </div>

          {lastAssigned && (
            <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm">
              Dernier assigné : {lastAssigned.name}
            </div>
          )}
          {removalHint && (
            <div className="rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm">
              {removalHint}
            </div>
          )}
          {message && (
            <div className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {teams.length > 0 && (
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Rosters en cours</CardTitle>
            <CardDescription className="text-slate-300">
              Chaque clic “Assigner” place un joueur aléatoire sur l’équipe suivante (round-robin).
            Clique sur un joueur pour le renvoyer dans la pile et réassigner.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {teams.map((t, idx) => (
              <div key={t.name} className="rounded-md border border-white/5 bg-black/20 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">#{idx + 1}</Badge>
                  <p className="font-semibold">{t.name}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Capitaine : {t.captain?.name ?? "(non tiré)"}
                </p>
                <div className="space-y-1 text-sm">
                  {t.players.length === 0 && <p className="text-muted-foreground">Aucun joueur assigné</p>}
                  {t.players.map((p) => (
                  <button
                    type="button"
                    onClick={() => removePlayer(idx, p.id)}
                    key={p.id}
                    className="w-full text-left rounded-md border border-white/5 bg-black/10 px-2 py-1 hover:border-amber-400/60 hover:bg-amber-500/10 transition"
                    title="Cliquer pour retirer et remettre dans la pile"
                  >
                      {p.name}
                  </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
