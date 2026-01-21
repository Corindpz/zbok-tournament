import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { env } from "@/lib/env";
import { setSession, clearSession } from "@/lib/session";

const COOKIE_NAME = "zt_session";
const MAX_AGE = 60 * 60 * 24 * 7;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV !== "development",
  path: "/",
  maxAge: MAX_AGE,
};

type LoginBody = {
  email?: string;
  password?: string;
  adminKey?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<LoginBody>;
    const { email, password, adminKey } = body;

    // Admin key bypass (no DB lookup)
    if (adminKey && adminKey === env.adminSecretKey) {
      const res = NextResponse.json({ ok: true, role: "admin", admin: true });
      res.cookies.set(
        COOKIE_NAME,
        JSON.stringify({ admin: true, role: "admin" }),
        cookieOptions
      );
      return res;
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "email et password requis" },
        { status: 400 }
      );
    }

    const { data: user, error: userErr } = await supabaseAdmin
      .from("users")
      .select("id,password_hash,role,is_active,email")
      .eq("email", email)
      .maybeSingle();

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    if (user.is_active === false) {
      return NextResponse.json(
        { error: "Compte inactif" },
        { status: 403 }
      );
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return NextResponse.json(
        { error: "Mot de passe incorrect" },
        { status: 401 }
      );
    }

    const payload = {
      role: user.role,
      user_id: user.id,
      admin: user.role === "admin",
      email: user.email,
    };
    const res = NextResponse.json({
      ok: true,
      role: user.role,
      user_id: user.id,
      admin: user.role === "admin",
    });
    res.cookies.set(COOKIE_NAME, JSON.stringify(payload), cookieOptions);
    return res;
  } catch (e) {
    console.error("[auth/login]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
