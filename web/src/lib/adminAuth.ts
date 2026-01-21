import { env } from "@/lib/env";

export function assertAdminKey(adminKey?: string | null) {
  if (!adminKey || adminKey !== env.adminSecretKey) {
    const err = new Error("Admin key invalide");
    // @ts-expect-error attach status for route handler
    err.status = 401;
    throw err;
  }
}
