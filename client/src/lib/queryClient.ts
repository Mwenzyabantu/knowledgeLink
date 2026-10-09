import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from "./supabase";

type AuthSession = NonNullable<
  Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]
>;

let avatarMetadataRepair: Promise<AuthSession> | null = null;
const MAX_AUTH_TOKEN_CHARS = 12_000;

function isInlineAvatar(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}

async function repairAvatarMetadataSession(
  session: AuthSession,
): Promise<AuthSession> {
  const avatar = session.user.user_metadata?.avatar_url;
  if (isInlineAvatar(avatar)) {
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: null },
    });
    if (updateError) {
      throw new Error(
        `Could not remove the old profile photo from the login token: ${updateError.message}`,
      );
    }
  }

  const { data, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw refreshError;
  if (!data.session) {
    throw new Error("Could not refresh the session after updating profile metadata.");
  }

  if (
    isInlineAvatar(data.session.user.user_metadata?.avatar_url) ||
    data.session.access_token.length > MAX_AUTH_TOKEN_CHARS
  ) {
    throw new Error("The login token is still too large after refreshing the session.");
  }

  if (isInlineAvatar(avatar)) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatar })
      .eq("id", data.session.user.id);
    if (profileError) {
      console.error(
        "Could not move the old profile photo to the profile record:",
        profileError,
      );
    }
  }

  return data.session;
}

async function getRequestSession(): Promise<AuthSession | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const session = data.session;
  if (!session) return null;
  if (avatarMetadataRepair) return avatarMetadataRepair;
  if (
    !isInlineAvatar(session.user.user_metadata?.avatar_url) &&
    session.access_token.length <= MAX_AUTH_TOKEN_CHARS
  ) return session;

  avatarMetadataRepair = repairAvatarMetadataSession(session).finally(() => {
    avatarMetadataRepair = null;
  });
  return avatarMetadataRepair;
}

async function getAuthHeaders(headers?: HeadersInit): Promise<Headers> {
  const result = new Headers(headers);
  const session = await getRequestSession();
  if (session?.access_token) {
    result.set("Authorization", `Bearer ${session.access_token}`);
  }
  return result;
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
  const headers = await getAuthHeaders(
    data ? { "Content-Type": "application/json" } : undefined,
  );
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers = await getAuthHeaders();
    const res = await fetch(queryKey.join("/") as string, {
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
