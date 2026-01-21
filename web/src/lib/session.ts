import { cookies } from "next/headers";
import { env } from "@/lib/env";

const COOKIE_NAME = "zt_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

type SessionData = {
  user_id?: string;
  role?: string;
  admin?: boolean;
  email?: string;
};

export async function setSession(data: SessionData) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(data), {
    httpOnly: true,
    // In dev over http, secure must be false; in production keep true.
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
    // For self-hosted behind http, flip secure to false if needed.
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { httpOnly: true, secure: true, sameSite: "lax", maxAge: 0, path: "/" });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
