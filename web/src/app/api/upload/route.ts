import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertAdminKey } from "@/lib/adminAuth";
import crypto from "crypto";

const ALLOWED_BUCKETS = new Set(["profiles", "teams"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "multipart/form-data requis" }, { status: 400 });
    }

    const form = await req.formData();
    const adminKey = form.get("adminKey")?.toString();
    assertAdminKey(adminKey);

    const bucket = form.get("bucket")?.toString();
    if (!bucket || !ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: "bucket invalide" }, { status: 400 });
    }

    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "fichier requis" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Fichier > 5MB" }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : null;
    if (!ext) {
      return NextResponse.json({ error: "Format autorisé: jpg/png" }, { status: 400 });
    }

    const path = `${bucket}/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path.replace(`${bucket}/`, ""), file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data: publicUrl } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path);

    return NextResponse.json({ ok: true, path: data.path, publicUrl: publicUrl.publicUrl });
  } catch (e: any) {
    const status = e?.status ?? 500;
    const message = e?.message ?? "Erreur serveur";
    console.error("[upload]", e);
    return NextResponse.json({ error: message }, { status });
  }
}
