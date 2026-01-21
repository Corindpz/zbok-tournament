import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertAdminKey } from "@/lib/adminAuth";

type MercatoBody = {
  adminKey?: string;
  mercato_date?: string;
  is_active?: boolean;
  number_of_teams?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<MercatoBody>;
    assertAdminKey(body.adminKey);

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.mercato_date) payload.mercato_date = new Date(body.mercato_date).toISOString();
    if (typeof body.is_active === "boolean") payload.is_active = body.is_active;
    if (typeof body.number_of_teams === "number") payload.number_of_teams = body.number_of_teams;

    const { error } = await supabaseAdmin
      .from("mercato_settings")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e?.status ?? 500;
    const message = e?.message ?? "Erreur serveur";
    console.error("[admin/mercato]", e);
    return NextResponse.json({ error: message }, { status });
  }
}
