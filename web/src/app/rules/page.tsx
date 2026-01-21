import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks } from "lucide-react";

const rules = [
  "Les équipes durent 1 mois (mercato à date fixe).",
  "Si un joueur est absent, le capitaine peut appeler un remplaçant.",
  "Un joueur peut être marqué inactif / viré s'il int volontairement.",
  "Les remplaçants globaux peuvent jouer pour toutes les équipes restantes.",
  "Les résultats de match doivent être saisis par un admin sous 24h.",
];

export default function RulesPage() {
  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader className="flex flex-row items-start gap-3">
        <div className="rounded-lg bg-primary/20 p-2 text-primary">
          <ListChecks className="h-5 w-5" />
        </div>
        <div>
          <CardTitle>Règlement</CardTitle>
          <CardDescription className="text-slate-300">
            Section statique, modifiable dans le contenu.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule}
            className="flex items-start gap-3 rounded-md border border-white/5 bg-black/20 p-3 text-sm"
          >
            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary" />
            <p>{rule}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
