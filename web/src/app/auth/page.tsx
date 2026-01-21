"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { env } from "@/lib/env";

export default function AuthPage() {
  const router = useRouter();
  const [loginLoading, startLogin] = useTransition();
  const [registerLoading, startRegister] = useTransition();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [logoutSuccess, setLogoutSuccess] = useState<string | null>(null);

  const handleLogin = (formData: FormData) => {
    setLoginError(null);
    setLoginSuccess(null);
    setLogoutSuccess(null);
    startLogin(async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
          adminKey: formData.get("adminKey"),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setLoginError(json.error || "Erreur login");
      } else {
        setLoginSuccess(
          json.admin ? "Connecté en admin" : `Connecté (role: ${json.role})`
        );
        router.push("/profile");
        router.refresh();
      }
    });
  };

  const handleRegister = (formData: FormData) => {
    setRegisterError(null);
    setRegisterSuccess(null);
    setLogoutSuccess(null);
    startRegister(async () => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.get("emailRegister"),
          username: formData.get("username"),
          password: formData.get("passwordRegister"),
          ingame_nickname: formData.get("nickname"),
          role: formData.get("role"),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setRegisterError(json.error || "Erreur inscription");
      } else {
        setRegisterSuccess("Compte joueur créé");
        router.push("/profile");
        router.refresh();
      }
    });
  };

  const handleLogout = () => {
    setLogoutSuccess(null);
    startLogin(async () => {
      const res = await fetch("/api/auth/login", { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setLogoutSuccess("Déconnecté");
        router.push("/auth");
        router.refresh();
      } else {
        setLoginError("Erreur déconnexion");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Authentification</p>
        <h1 className="text-3xl font-bold text-white">Connexion / Inscription</h1>
        <p className="max-w-2xl text-muted-foreground">
          Login email/mot de passe pour les joueurs. La clé admin est vérifiée côté serveur (non exposée).
        </p>
      </div>

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>Accéder au tournoi</CardTitle>
          <CardDescription className="text-slate-300">
            Ces formulaires appellent les routes /api/auth/login et /api/auth/register (Supabase service_role).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="space-y-4 py-4">
              <form action={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="you@email.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input id="password" name="password" type="password" placeholder="••••••" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminKey">Clé admin (optionnel)</Label>
                  <Input id="adminKey" name="adminKey" type="password" placeholder="ADMIN_SECRET_KEY" />
                </div>
                {loginError && <p className="text-sm text-red-400">{loginError}</p>}
                {loginSuccess && <p className="text-sm text-green-400">{loginSuccess}</p>}
                <Button className="w-full" type="submit" disabled={loginLoading}>
                  {loginLoading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register" className="space-y-4 py-4">
              <form action={handleRegister} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" name="username" placeholder="Invoker" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nickname">Pseudo in-game</Label>
                    <Input id="nickname" name="nickname" placeholder="SummonerName" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailRegister">Email</Label>
                  <Input id="emailRegister" name="emailRegister" type="email" placeholder="you@email.com" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="passwordRegister">Mot de passe</Label>
                    <Input id="passwordRegister" name="passwordRegister" type="password" placeholder="••••••" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Rôle (TOP/JUNGLE/...)</Label>
                    <Input id="role" name="role" placeholder="MID" />
                  </div>
                </div>
                {registerError && <p className="text-sm text-red-400">{registerError}</p>}
                {registerSuccess && <p className="text-sm text-green-400">{registerSuccess}</p>}
                <Button className="w-full" type="submit" disabled={registerLoading}>
                  {registerLoading ? "Création..." : "Créer mon compte joueur"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription className="text-slate-300">
            Déconnexion (efface le cookie de session)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {logoutSuccess && <p className="text-sm text-green-400">{logoutSuccess}</p>}
          {loginError && <p className="text-sm text-red-400">{loginError}</p>}
          <Button variant="outline" onClick={handleLogout} disabled={loginLoading}>
            {loginLoading ? "Déconnexion..." : "Se déconnecter"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
