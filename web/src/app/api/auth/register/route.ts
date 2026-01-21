import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const COOKIE_NAME = "zt_session";
const MAX_AGE = 60 * 60 * 24 * 7;
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV !== "development",
  path: "/",
  maxAge: MAX_AGE,
};

type RegisterBody = {
  email: string;
  username: string;
  password: string;
  ingame_nickname: string;
  role?: "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<RegisterBody>;
    const { email, username, password, ingame_nickname, role } = body;

    if (!email || !username || !password || !ingame_nickname) {
      return NextResponse.json(
        { error: "email, username, password, ingame_nickname requis" },
        { status: 400 }
      );
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: userInsert, error: userErr } = await supabaseAdmin
      .from("users")
      .insert({
        email,
        username,
        password_hash,
        role: "player",
      })
      .select("id")
      .single();

    if (userErr || !userInsert) {
      return NextResponse.json(
        { error: userErr?.message ?? "Erreur création utilisateur" },
        { status: 400 }
      );
    }

    const { error: playerErr } = await supabaseAdmin.from("players").insert({
      user_id: userInsert.id,
      ingame_nickname,
      role: role ?? null,
    });

    if (playerErr) {
      return NextResponse.json(
        { error: playerErr.message },
        { status: 400 }
      );
    }

    const res = NextResponse.json({
      ok: true,
      user_id: userInsert.id,
      role: "player",
      admin: false,
    });
    res.cookies.set(
      COOKIE_NAME,
      JSON.stringify({
        role: "player",
        user_id: userInsert.id,
        admin: false,
        email,
      }),
      cookieOptions
    );
    return res;
  } catch (e) {
    console.error("[auth/register]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
