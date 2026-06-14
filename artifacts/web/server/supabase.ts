import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://hzhweoiwfldtmwphdkzr.supabase.co";

const anonKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aHdlb2l3ZmxkdG13cGhka3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODk4NjgsImV4cCI6MjA5NTc2NTg2OH0.XNoUCjNM0-Wf4eYdPjVy3w3qHBNReE6RLOIY-K9TfIk";

export const SUPABASE_ANON_KEY = anonKey;

export const supabase = createClient(SUPABASE_URL, anonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});
