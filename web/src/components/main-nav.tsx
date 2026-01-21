import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  activePath?: string;
  isAdmin?: boolean;
};

export function MainNav({ activePath, isAdmin }: Props) {
  const routes = [
    { href: "/", label: "Accueil" },
    { href: "/news", label: "News" },
    { href: "/rules", label: "Règles" },
    { href: "/matches", label: "Matchs" },
    { href: "/teams", label: "Équipes" },
    { href: "/profile", label: "Profil" },
    ...(isAdmin
      ? [
          { href: "/mercato", label: "Mercato" },
          { href: "/settings", label: "Paramètres" },
        ]
      : []),
  ];

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
      {routes.map((route) => {
        const isActive = activePath === route.href;
        return (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "rounded-md px-3 py-2 transition-colors hover:bg-muted hover:text-foreground",
              isActive && "bg-muted text-foreground"
            )}
          >
            {route.label}
          </Link>
        );
      })}
    </nav>
  );
}
