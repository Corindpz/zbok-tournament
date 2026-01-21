import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { assertAdminKey } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

async function updateMercato(formData: FormData) {
  "use server";
  const adminKey = formData.get("adminKey")?.toString();
  assertAdminKey(adminKey);

  const number_of_teams = formData.get("teams")
    ? Number(formData.get("teams"))
    : undefined;
  const mercato_date = formData.get("date")?.toString();
  const is_active = formData.get("is_active") === "on";

  await supabaseAdmin.from("mercato_settings").upsert({
    number_of_teams,
    mercato_date: mercato_date ? new Date(mercato_date).toISOString() : null,
    is_active,
    updated_at: new Date().toISOString(),
  });

  await supabaseAdmin.from("news_feed").insert({
    type: "team_created",
    title: "Mercato mis à jour",
    description: `Actif=${is_active} • Équipes=${number_of_teams ?? "?"}`,
  });

  await revalidatePath("/mercato");
}

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.admin) {
    return (
      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>Accès restreint</CardTitle>
          <CardDescription className="text-slate-300">
            Paramètres réservés aux admins.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Paramètres (Admin)</p>
        <h1 className="text-3xl font-bold text-white">Configuration générale</h1>
        <p className="text-muted-foreground">
          Variables d&apos;env, clé admin, toggles UX. Lier aux secrets Vercel + Supabase.
        </p>
      </div>

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>Affichage</CardTitle>
          <CardDescription className="text-slate-300">
            Dark mode par défaut. Ajoutez un vrai toggle (context + localStorage).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between rounded-md border border-white/5 bg-black/20 px-4 py-3">
          <div>
            <p className="font-semibold">Mode sombre</p>
            <p className="text-sm text-muted-foreground">Activé par défaut</p>
          </div>
          <Switch defaultChecked />
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>Clés & API</CardTitle>
          <CardDescription className="text-slate-300">
            Ne jamais commit les secrets. Stocker dans `.env.local` / Vercel env.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Supabase URL</Label>
              <Input value={env.supabaseUrl} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Supabase anon key</Label>
              <Input value={env.supabaseAnonKey ? "••••••" : ""} readOnly />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Service key (server only)</Label>
              <Input placeholder="Non fournie" readOnly />
            </div>
            <div className="space-y-2">
              <Label>Admin secret key</Label>
              <Input value={env.adminSecretKey ? "••••••" : ""} readOnly />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Clé Riot (24h)</Label>
            <Input value={env.riotApiKey ? "••••••" : ""} readOnly />
            <p className="text-xs text-muted-foreground">
              Regénérez la clé depuis le portail Riot (Developer) et mettez à jour la variable.
            </p>
          </div>
          <Button className="w-full" variant="outline">
            Sauvegarder (à brancher)
          </Button>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>Mercato (admin)</CardTitle>
          <CardDescription className="text-slate-300">
            Met à jour `mercato_settings` + notifie le feed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateMercato} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="teams">Nombre d'équipes</Label>
                <Input id="teams" name="teams" type="number" min={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date du mercato</Label>
                <Input id="date" name="date" type="datetime-local" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-white/5 bg-black/20 px-3 py-2">
              <div>
                <p className="font-semibold">Activer</p>
                <p className="text-xs text-muted-foreground">Toggle actif</p>
              </div>
              <Switch name="is_active" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminKey">Clé admin</Label>
              <Input id="adminKey" name="adminKey" type="password" required />
            </div>
            <Button type="submit" className="w-full">Mettre à jour</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
