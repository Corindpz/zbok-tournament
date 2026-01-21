"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  const handleLogout = () => {
    start(async () => {
      await fetch("/api/auth/login", {
        method: "DELETE",
        credentials: "include",
      });
      router.push("/auth");
      router.refresh();
    });
  };

  return (
    <Button variant="outline" size="sm" className="border-white/20" onClick={handleLogout} disabled={pending}>
      {pending ? "Logout..." : "Logout"}
    </Button>
  );
}
