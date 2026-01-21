"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function MercatoPlanner() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [numberOfTeams, setNumberOfTeams] = useState<number | "">("");
  const [date, setDate] = useState("");
  const [active, setActive] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setMessage(null);
    setError(null);
    if (!adminKey) {
      setError("Clé admin requise");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/mercato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminKey,
          number_of_teams: typeof numberOfTeams === "number" ? numberOfTeams : undefined,
          mercato_date: date || undefined,
          is_active: active,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erreur");
      } else {
        setMessage("Planification enregistrée");
        router.refresh();
      }
    });
  };

  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader>
        <CardTitle>Planifier le prochain mercato</CardTitle>
        <CardDescription className="text-slate-300">
          Met à jour `mercato_settings` (date, actif, nombre d'équipes).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Date</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md bg-black/30 px-3 py-2 text-white"
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
        </div>
        <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-3 py-2">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Mercato actif</p>
            <p className="text-sm text-white">{active ? "Oui" : "Non"}</p>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
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
        <Button onClick={submit} disabled={pending} className="w-full">
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
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
  );
}
