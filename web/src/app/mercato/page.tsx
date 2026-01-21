import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession } from "@/lib/session";
import { MercatoWheel } from "@/components/mercato-wheel";
import { MercatoChecklist } from "@/components/mercato-checklist";
import { MercatoRunner } from "@/components/mercato-runner";
import { MercatoStepper } from "@/components/mercato-stepper";
import { MercatoSeeder } from "@/components/mercato-seeder";

const steps = [
  "Choisir le nombre d'équipes",
  "Tirage aléatoire des capitaines",
  "Marquer les joueurs disponibles",
  "Phase de draft : picks tour par tour",
  "Phase roue : assignation aléatoire des restants",
  "Restants = remplaçants globaux",
  "Validation + news feed automatique",
];

async function getSettings() {
  const { data } = await supabaseAdmin
    .from("mercato_settings")
    .select("mercato_date,is_active,number_of_teams,updated_at")
    .limit(1)
    .maybeSingle();
  return data;
}

export default async function MercatoPage() {
  const [settings, session] = await Promise.all([getSettings(), getSession()]);
  if (!session?.admin) {
    return (
      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>Accès restreint</CardTitle>
          <CardDescription className="text-slate-300">
            Mercato réservé aux admins.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Mercato (Admin)</p>
          <h1 className="text-3xl font-bold text-white">Renouvellement mensuel</h1>
          <p className="text-muted-foreground">
            Paramétrage via la table `mercato_settings`, génération des équipes + news.
          </p>
        </div>
      </div>

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>État actuel</CardTitle>
          <CardDescription className="text-slate-300">
            Lecture directe de `mercato_settings`
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-md border border-white/5 bg-black/20 p-3">
            <p className="text-xs uppercase text-muted-foreground">Actif</p>
            <p className="text-lg font-semibold">{settings?.is_active ? "Oui" : "Non"}</p>
          </div>
          <div className="rounded-md border border-white/5 bg-black/20 p-3">
            <p className="text-xs uppercase text-muted-foreground">Équipes</p>
            <p className="text-lg font-semibold">
              {settings?.number_of_teams ?? "—"}
            </p>
          </div>
          <div className="rounded-md border border-white/5 bg-black/20 p-3">
            <p className="text-xs uppercase text-muted-foreground">Date mercato</p>
            <p className="text-lg font-semibold">
              {settings?.mercato_date
                ? new Date(settings.mercato_date).toLocaleString()
                : "Non définie"}
            </p>
          </div>
          <div className="rounded-md border border-white/5 bg-black/20 p-3">
            <p className="text-xs uppercase text-muted-foreground">Dernière maj</p>
            <p className="text-lg font-semibold">
              {settings?.updated_at ? new Date(settings.updated_at).toLocaleString() : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
          <CardDescription className="text-slate-300">
            Suivi visuel du workflow mercato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MercatoChecklist />
        </CardContent>
      </Card>

      <MercatoWheel />

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>Seed de test</CardTitle>
          <CardDescription className="text-slate-300">
            Crée des faux joueurs et 2 équipes (Test Alpha/Beta) pour essayer le mercato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MercatoSeeder />
        </CardContent>
      </Card>

      <MercatoStepper />

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>Exécution automatique (one-shot)</CardTitle>
          <CardDescription className="text-slate-300">
            Crée des équipes “Mercato Team N”, assigne capitaines + roster aléatoires en une fois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MercatoRunner />
        </CardContent>
      </Card>
    </div>
  );
}
