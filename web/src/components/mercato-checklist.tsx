"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const steps = [
  "Choisir le nombre d'équipes",
  "Tirage aléatoire des capitaines",
  "Marquer les joueurs disponibles",
  "Phase de draft : picks tour par tour",
  "Phase roue : assignation aléatoire des restants",
  "Restants = remplaçants globaux",
  "Validation + news feed automatique",
];

export function MercatoChecklist() {
  const [done, setDone] = useState<boolean[]>(Array(steps.length).fill(false));

  const toggle = (idx: number) => {
    setDone((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const reset = () => setDone(Array(steps.length).fill(false));

  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div
          key={step}
          className="flex items-center justify-between rounded-md border border-white/5 bg-black/20 px-3 py-2"
        >
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Étape {index + 1}</Badge>
            <p className={done[index] ? "line-through text-muted-foreground" : ""}>{step}</p>
          </div>
          <Button variant={done[index] ? "outline" : "secondary"} size="sm" onClick={() => toggle(index)}>
            {done[index] ? "Revoir" : "Marquer fait"}
          </Button>
        </div>
      ))}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={reset}>
          Reset checklist
        </Button>
      </div>
    </div>
  );
}
