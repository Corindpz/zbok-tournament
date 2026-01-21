import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

if (!env.supabaseUrl || !process.env.SUPABASE_SERVICE_KEY) {
  // Surface a clear error during build/runtime on server
  throw new Error(
    "[supabaseAdmin] Missing SUPABASE_SERVICE_KEY or NEXT_PUBLIC_SUPABASE_URL"
  );
}

export const supabaseAdmin = createClient(
  env.supabaseUrl,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
