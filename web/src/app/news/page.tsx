import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertAdminKey } from "@/lib/adminAuth";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

type NewsRow = {
  id: string;
  type: "match_result" | "player_transfer" | "team_created";
  title: string;
  description: string;
  created_at: string;
};

async function getNews(): Promise<NewsRow[]> {
  const { data } = await supabaseAdmin
    .from("news_feed")
    .select("id,type,title,description,created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  return data ?? [];
}

async function createNews(formData: FormData) {
  "use server";
  const adminKey = formData.get("adminKey")?.toString();
  assertAdminKey(adminKey);

  const type = formData.get("type")?.toString() as NewsRow["type"];
  const title = formData.get("title")?.toString() || "";
  const description = formData.get("description")?.toString() || "";

  if (!type || !title || !description) {
    throw new Error("type, title, description requis");
  }

  await supabaseAdmin.from("news_feed").insert({
    type,
    title,
    description,
  });

  await revalidatePath("/news");
  await revalidatePath("/");
}

export default async function NewsPage() {
  const [news, session] = await Promise.all([getNews(), getSession()]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Actualités</p>
          <h1 className="text-3xl font-bold text-white">News feed</h1>
          <p className="text-muted-foreground">
            Résultats, transferts, créations d’équipes. Création admin ci-dessous.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Dernières actus</CardTitle>
            <CardDescription className="text-slate-300">
              Les plus récentes en premier
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {news.map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-white/5 bg-black/20 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{item.title}</p>
                  <Badge variant="outline">{item.type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
            ))}
            {news.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune actualité pour l’instant.</p>
            )}
          </CardContent>
        </Card>

        {session?.admin && (
          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle>Créer une actu (admin)</CardTitle>
              <CardDescription className="text-slate-300">
                Publie sur `news_feed` et rafraîchit l’accueil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createNews} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select name="type" required>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Choisir un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="match_result">match_result</SelectItem>
                      <SelectItem value="player_transfer">player_transfer</SelectItem>
                      <SelectItem value="team_created">team_created</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Titre</Label>
                  <Input id="title" name="title" placeholder="Titre" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" placeholder="Détail de l’actualité" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminKey">Clé admin</Label>
                  <Input id="adminKey" name="adminKey" type="password" required />
                </div>
                <Button type="submit" className="w-full">
                  Publier
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
