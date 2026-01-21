import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MainNav } from "@/components/main-nav";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: env.appName,
  description: "Gestionnaire de tournoi League of Legends",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  return (
    <html lang="fr" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-90 [background:radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.18),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.16),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.14),transparent_35%)]" />
          <header className="sticky top-0 z-20 border-b border-white/5 bg-black/60 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  🛡️
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">LOL Tournament</p>
                  <h1 className="text-lg font-semibold text-white">
                    {env.appName}
                  </h1>
                  {(session?.email || session?.role) && (
                    <p className="text-xs text-muted-foreground">
                      {session?.email ? `Connecté : ${session.email}` : ""} {session?.role ? `(${session.role})` : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
                {session?.admin && (
                  <div className="rounded-md bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                    Admin connecté
                  </div>
                )}
                <MainNav isAdmin={session?.admin} />
                {session?.user_id || session?.admin ? (
                  <LogoutButton />
                ) : (
                  <Button asChild size="sm" variant="outline" className="border-white/20">
                    <Link href="/auth">Login</Link>
                  </Button>
                )}
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
          <footer className="border-t border-white/5 bg-black/60 px-6 py-6 text-center text-sm text-muted-foreground backdrop-blur">
            &nbsp;
          </footer>
        </div>
      </body>
    </html>
  );
}
