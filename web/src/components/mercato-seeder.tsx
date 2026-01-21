"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function MercatoSeeder() {
  const [adminKey, setAdminKey] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setMessage(null);
    setError(null);
    if (!adminKey) {
      setError("Clé admin requise");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/mercato/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erreur");
      } else {
        setMessage("Seed OK : joueurs + Test Alpha/Beta");
      }
    });
  };

  return (
    <div className="space-y-2">
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
      <Button onClick={run} disabled={pending || !adminKey}>
        {pending ? "Seed..." : "Créer les faux joueurs/équipes"}
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
    </div>
  );
}
