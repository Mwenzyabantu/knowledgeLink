import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://hzhweoiwfldtmwphdkzr.supabase.co";

const serviceKey = process.env.SUPABSE_ACCESS_TOKEN;
if (!serviceKey) {
  throw new Error(
    "SUPABSE_ACCESS_TOKEN must be set (Supabase service role key)"
  );
}

export const supabaseAdmin = createClient(SUPABASE_URL, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
