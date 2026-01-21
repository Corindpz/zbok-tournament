"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Player = { id: string; name: string; inactive_reason: string | null };

export function MercatoWheel() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [picked, setPicked] = useState<Player | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/mercato/available");
    const json = await res.json();
    setPlayers(json.players ?? []);
    setPicked(null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const canSpin = useMemo(() => players.length > 0 && !spinning, [players, spinning]);

  const handleSpin = () => {
    if (!canSpin) return;
    setSpinning(true);
    // Simple random pick
    const idx = Math.floor(Math.random() * players.length);
    const player = players[idx];
    setTimeout(() => {
      setPicked(player);
      // Remove picked from list
      setPlayers((prev) => prev.filter((p) => p.id !== player.id));
      setSpinning(false);
    }, 1200);
  };

  return (
    <Card className="border-white/10 bg-gradient-to-br from-purple-900/40 to-slate-900/40 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Roue (draft aléatoire)</CardTitle>
        <CardDescription className="text-slate-300">
          Tire un joueur disponible (is_inactive = false). Retiré de la liste après tirage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">Joueurs disponibles</p>
            <p className="text-lg font-semibold">{players.length}</p>
          </div>
          <Button onClick={handleSpin} disabled={!canSpin}>
            {spinning ? "..." : "Lancer la roue"}
          </Button>
        </div>
        <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/10 px-4 py-3">
          <div className="text-xs text-muted-foreground">Reset et recharger les joueurs</div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? "..." : "Reset roue"}
          </Button>
        </div>
        {picked && (
          <div className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-4 py-3">
            <p className="text-xs uppercase text-emerald-300">Dernier tirage</p>
            <p className="text-lg font-semibold text-white">{picked.name}</p>
          </div>
        )}
        <div className="max-h-64 overflow-auto space-y-2 text-sm">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md border border-white/5 bg-black/20 px-3 py-2"
            >
              <span>{p.name}</span>
              {p.inactive_reason && <Badge variant="outline">Inactive</Badge>}
            </div>
          ))}
          {players.length === 0 && (
            <p className="text-sm text-muted-foreground">Plus de joueurs à tirer.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
