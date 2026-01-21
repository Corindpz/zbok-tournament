"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description?: string;
  bucket: "profiles" | "teams";
};

export function AdminUpload({ title, description, bucket }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [adminKey, setAdminKey] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = () => {
    if (!file) {
      setError("Choisissez un fichier");
      return;
    }
    setError(null);
    setResult(null);
    startTransition(async () => {
      const form = new FormData();
      form.append("file", file);
      form.append("bucket", bucket);
      form.append("adminKey", adminKey);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erreur upload");
      } else {
        setResult(json.publicUrl);
      }
    });
  };

  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription className="text-slate-300">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Fichier (jpg/png ≤5MB)</Label>
          <Input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="space-y-2">
          <Label>Clé admin</Label>
          <Input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="ADMIN_SECRET_KEY"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {result && (
          <p className="text-sm text-green-400 break-all">
            Upload OK: <a href={result} className="underline" target="_blank" rel="noreferrer">{result}</a>
          </p>
        )}
        <Button type="button" onClick={onSubmit} disabled={pending} className="w-full">
          {pending ? "Upload..." : "Uploader"}
        </Button>
      </CardContent>
    </Card>
  );
}
