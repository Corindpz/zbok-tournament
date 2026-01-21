import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export const createSupabaseBrowserClient = () => {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
};

export const createSupabaseServerClient = (cookies: () => string) => {
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies,
  });
};
