import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Opt-in: não cria conexão ou banco enquanto as variáveis não forem configuradas. */
export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
