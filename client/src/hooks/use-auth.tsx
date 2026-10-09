import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { supabase } from "../lib/supabase";
import { useToast } from "@/hooks/use-toast";

const PENDING_AVATAR_KEY = "knowledgeLink.pendingSignupAvatar";
const PENDING_AVATAR_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type PendingAvatar = {
  email: string;
  avatarUrl: string;
  expiresAt: number;
};

function savePendingAvatar(email: string, avatarUrl: string) {
  try {
    const pending: PendingAvatar = {
      email: email.trim().toLowerCase(),
      avatarUrl,
      expiresAt: Date.now() + PENDING_AVATAR_TTL_MS,
    };
    window.localStorage.setItem(PENDING_AVATAR_KEY, JSON.stringify(pending));
  } catch (error) {
    console.error("Could not temporarily save the profile photo:", error);
  }
}

async function applyPendingAvatar(userId: string, email: string) {
  try {
    const stored = window.localStorage.getItem(PENDING_AVATAR_KEY);
    if (!stored) return;

    const pending = JSON.parse(stored) as PendingAvatar;
    if (
      !pending.email ||
      !pending.avatarUrl ||
      !pending.expiresAt ||
      pending.expiresAt <= Date.now()
    ) {
      window.localStorage.removeItem(PENDING_AVATAR_KEY);
      return;
    }
    if (pending.email !== email.trim().toLowerCase()) return;

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: pending.avatarUrl })
      .eq("id", userId);
    if (error) {
      console.error("Could not save the pending profile photo:", error);
      return;
    }

    window.localStorage.removeItem(PENDING_AVATAR_KEY);
    void queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  } catch (error) {
    console.error("Could not apply the pending profile photo:", error);
  }
}

  type AuthContextType = {
    user: SelectUser | null;
    isLoading: boolean;
    error: Error | null;
    loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
    logoutMutation: UseMutationResult<void, Error, void>;
    registerMutation: UseMutationResult<SelectUser | null, Error, InsertUser>;
  };

  type LoginData = Pick<InsertUser, "email" | "password">;

  export const AuthContext = createContext<AuthContextType | null>(null);

  export function AuthProvider({ children }: { children: ReactNode }) {
    const { toast } = useToast();

    useEffect(() => {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (!session) {
          queryClient.setQueryData(["/api/user"], null);
          queryClient.removeQueries({ queryKey: ["/api/personalization"] });
          queryClient.removeQueries({ queryKey: ["/api/user-personalization"] });
          return;
        }

        if (event === "SIGNED_IN") {
          queryClient.removeQueries({ queryKey: ["/api/personalization"] });
          queryClient.removeQueries({ queryKey: ["/api/user-personalization"] });
        }
        void queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        if (session.user.email) {
          window.setTimeout(() => {
            void applyPendingAvatar(session.user.id, session.user.email!);
          }, 0);
        }
      });

      return () => subscription.unsubscribe();
    }, []);

    const {
      data: user,
      error,
      isLoading,
    } = useQuery<SelectUser | null, Error>({
      queryKey: ["/api/user"],
      queryFn: getQueryFn({ on401: "returnNull" }),
      retry: false,
      refetchOnWindowFocus: false,
    });

    const loginMutation = useMutation({
      mutationFn: async (credentials: LoginData) => {
        const { error } = await supabase.auth.signInWithPassword(credentials);
        if (error) throw error;

        const res = await apiRequest("GET", "/api/user");
        return (await res.json()) as SelectUser;
      },
      onSuccess: (user: SelectUser) => {
        queryClient.setQueryData(["/api/user"], user);
        toast({
          title: "Login successful",
          description: `Welcome back, ${user.username}!`,
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });

    const registerMutation = useMutation({
      mutationFn: async (newUser: InsertUser) => {
        const { data, error } = await supabase.auth.signUp({
          email: newUser.email,
          password: newUser.password,
          options: {
            data: {
              username: newUser.username,
            },
          },
        });
        if (error) throw error;
        if (!data.session || !data.user) {
          if (newUser.avatarUrl) {
            savePendingAvatar(newUser.email, newUser.avatarUrl);
          }
          return null;
        }

        if (newUser.avatarUrl) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ avatar_url: newUser.avatarUrl })
            .eq("id", data.user.id);
          if (profileError) {
            throw new Error(
              "Your account was created, but the profile photo could not be saved. Sign in and try again.",
            );
          }
        }

        const res = await apiRequest("GET", "/api/user");
        return (await res.json()) as SelectUser;
      },
      onSuccess: (user: SelectUser | null) => {
        if (user) {
          queryClient.setQueryData(["/api/user"], user);
          toast({
            title: "Registration successful",
            description: `Welcome, ${user.username}!`,
          });
        } else {
          toast({
            title: "Confirm your email",
            description: "Check your inbox to finish creating your account.",
          });
        }
      },
      onError: (error: Error) => {
        toast({
          title: "Registration failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });

    const logoutMutation = useMutation({
      mutationFn: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.setQueryData(["/api/user"], null);
      },
      onError: (error: Error) => {
        toast({
          title: "Logout failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });

    return (
      <AuthContext.Provider
        value={{
          user: user ?? null,
          isLoading,
          error,
          loginMutation,
          logoutMutation,
          registerMutation,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
      throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
  }
  