import { AsyncLocalStorage } from "node:async_hooks";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseRequestContext = {
  client: SupabaseClient;
  userId: string | null;
};

const requestContext = new AsyncLocalStorage<SupabaseRequestContext>();

export function getSupabaseConfig() {
  const url = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be configured.");
  }

  return { url, publishableKey };
}

export function createRequestSupabaseClient(accessToken?: string) {
  const { url, publishableKey } = getSupabaseConfig();
  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

export function runWithSupabaseContext<T>(
  context: SupabaseRequestContext,
  callback: () => T,
): T {
  return requestContext.run(context, callback);
}

export function getSupabaseContext() {
  const context = requestContext.getStore();
  if (!context) {
    throw new Error("Supabase storage was used outside an authenticated request.");
  }
  return context;
}

export function getSupabaseClient() {
  return getSupabaseContext().client;
}
