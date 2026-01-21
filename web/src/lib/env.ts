const missing = [];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const adminSecretKey = process.env.ADMIN_SECRET_KEY;
if (!adminSecretKey) missing.push("ADMIN_SECRET_KEY");

const riotApiKey = process.env.NEXT_PUBLIC_RIOT_API_KEY;
if (!riotApiKey) missing.push("NEXT_PUBLIC_RIOT_API_KEY");

if (missing.length > 0 && typeof window === "undefined") {
  console.warn(
    "[env] Missing environment variables:",
    missing.join(", ")
  );
}

export const env = {
  supabaseUrl: supabaseUrl ?? "",
  supabaseAnonKey: supabaseAnonKey ?? "",
  adminSecretKey: adminSecretKey ?? "",
  riotApiKey: riotApiKey ?? "",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Zbok tournament",
};
