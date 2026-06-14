import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/query-persist-client-core";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { supabase } from "@/lib/supabase";
import { localStorage } from "@/lib/services/localStorage";
import { safeStorage } from "@/lib/safeStorage";

async function getSupabaseToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = await getSupabaseToken();
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// LocalStorage-based query function that intercepts /api/* paths
const localQueryFn: QueryFunction = async ({ queryKey }) => {
  const path = queryKey.join("/");

  // Intercept local API paths
  if (path === "/api/concepts") {
    return localStorage.concepts.getAll();
  }
  if (path === "/api/opportunity-projects") {
    return localStorage.projects.getAll();
  }
  if (path === "/api/idea-sessions") {
    return localStorage.ideas.getAll();
  }
  if (path === "/api/implementations") {
    return [];
  }
  if (path === "/api/trends") {
    return [];
  }
  if (path === "/api/user-personalization") {
    return localStorage.prefs.get().personalization || {};
  }
  if (path === "/api/insights/profile") {
    const concepts = localStorage.concepts.getAll();
    return {
      totalConcepts: concepts.length,
      totalProjects: localStorage.projects.getAll().length,
      totalIdeas: localStorage.ideas.getAll().length,
      todayConcepts: concepts.filter((c) => {
        const d = new Date(c.createdAt);
        const today = new Date();
        return d.toDateString() === today.toDateString();
      }).length,
      streak: 0,
      recentActivity: concepts.slice(0, 5).map((c) => ({
        type: "concept",
        title: c.title,
        date: c.createdAt,
      })),
    };
  }

  // Fallback: try to fetch from the original URL (for edge functions, etc.)
  const token = await getSupabaseToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(path, { credentials: "include", headers });
  if (res.status === 401) {
    return null;
  }
  await throwIfResNotOk(res);
  return await res.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: localQueryFn,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Persist cache to localStorage for offline reads
// Use safeStorage so restricted iframe / private-browsing environments never throw
const persister = createSyncStoragePersister({
  storage: safeStorage,
  key: "kl_query_cache",
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24,
  buster: "v1",
});
