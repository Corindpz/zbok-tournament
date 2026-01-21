import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminUpload } from "@/components/admin-upload";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { User, Gamepad2, Shield } from "lucide-react";
import { revalidatePath } from "next/cache";

type ProfileData = {
  username: string | null;
  email: string | null;
  ingame_nickname: string | null;
  role: string | null;
};

async function getUserAndPlayer(user_id: string): Promise<ProfileData | null> {
  const [{ data: user }, { data: player }] = await Promise.all([
    supabaseAdmin.from("users").select("username,email").eq("id", user_id).maybeSingle(),
    supabaseAdmin.from("players").select("ingame_nickname, role").eq("user_id", user_id).maybeSingle(),
  ]);

  if (!user) return null;

  // If player missing, create one with a fallback nickname
  if (!player) {
    const fallbackNick =
      user.username ?? (user.email ? user.email.split("@")[0] : `player-${user_id.slice(0, 6)}`);
    await supabaseAdmin.from("players").insert({
      user_id,
      ingame_nickname: fallbackNick,
    });
    return {
      username: user.username,
      email: user.email,
      ingame_nickname: fallbackNick,
      role: null,
    };
  }

  return {
    username: user.username,
    email: user.email,
    ingame_nickname: player.ingame_nickname,
    role: player.role,
  };
}

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.user_id && !session?.admin) {
    return (
      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>Non connecté</CardTitle>
          <CardDescription className="text-slate-300">
            Connecte-toi pour voir ton profil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/auth">Aller au login</a>
          </Button>
        </CardContent>
      </Card>
    );
  }
  const profile = session.user_id ? await getUserAndPlayer(session.user_id) : null;

  async function updatePlayer(formData: FormData) {
    "use server";
    if (!session.user_id) return;
    const ingame_nickname = formData.get("ingame_nickname")?.toString() || null;
    const role = formData.get("role")?.toString() || null;
    await supabaseAdmin
      .from("players")
      .update({
        ingame_nickname,
        role,
      })
      .eq("user_id", session.user_id);
    revalidatePath("/profile");
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Profil joueur</p>
        <h1 className="text-3xl font-bold text-white">Mon compte</h1>
        <p className="text-muted-foreground">
          Les données seront tirées de `users` / `players` (ici placeholder).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-4 w-4" /> Identité</CardTitle>
            <CardDescription className="text-slate-300">
              Photo de profil, nickname, rôle et équipe actuelle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold">{profile?.username ?? (session.admin ? "Admin" : "—")}</p>
                <p className="text-sm text-muted-foreground">Email : {profile?.email ?? (session.admin ? "—" : "—")}</p>
                <p className="text-sm text-muted-foreground">Ingame : {profile?.ingame_nickname ?? (session.admin ? "—" : "—")}</p>
                <p className="text-sm text-muted-foreground">Équipe : —</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">Actif</Badge>
                {session.admin && <Badge variant="outline">Admin</Badge>}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                <p className="text-2xl font-semibold">0</p>
                <p className="text-sm text-muted-foreground">Matchs totaux</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                <p className="text-2xl font-semibold">0</p>
                <p className="text-sm text-muted-foreground">Victoires</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                <p className="text-2xl font-semibold">0%</p>
                <p className="text-sm text-muted-foreground">Rôle : {profile?.role ?? "—"}</p>
              </div>
            </div>
            {session.user_id && (
              <form action={updatePlayer} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Ingame nickname</label>
                  <input
                    name="ingame_nickname"
                    defaultValue={profile?.ingame_nickname ?? ""}
                    className="w-full rounded-md bg-black/30 px-3 py-2 text-white"
                    placeholder="Pseudo in-game"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Rôle</label>
                  <select
                    name="role"
                    defaultValue={profile?.role ?? ""}
                    className="w-full rounded-md bg-black/30 px-3 py-2 text-white"
                  >
                    <option value="">(non défini)</option>
                    <option value="TOP">TOP</option>
                    <option value="JUNGLE">JUNGLE</option>
                    <option value="MID">MID</option>
                    <option value="ADC">ADC</option>
                    <option value="SUPPORT">SUPPORT</option>
                  </select>
                </div>
                <Button type="submit">Enregistrer</Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> Récap rapide</CardTitle>
            <CardDescription className="text-slate-300">
              Participation aux derniers matchs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Aucun match récent</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gamepad2 className="h-4 w-4" /> Winrate par champion</CardTitle>
          <CardDescription className="text-slate-300">
            Basé sur `player_stats` (placeholder vide)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune donnée pour l’instant.</p>
        </CardContent>
      </Card>

      {session?.admin && (
        <AdminUpload
          title="Upload photo de profil (admin)"
          description="Bucket Supabase profiles (jpg/png ≤5MB). Nécessite la clé admin."
          bucket="profiles"
        />
      )}
    </div>
  );
}
