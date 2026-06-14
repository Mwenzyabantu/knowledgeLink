import { ReactNode, useContext, useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  AuthContext,
  type AuthUser,
  type LoginData,
  type RegisterData,
} from "./auth-context";

export type { AuthUser, AuthContextType, LoginData, RegisterData } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [supabaseReady, setSupabaseReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function init() {
      await supabase.auth.getSession();
      if (mounted) setSupabaseReady(true);
    }
    init();
    return () => { mounted = false; };
  }, []);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<AuthUser | null, Error>({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
      const u = session.user;
      return {
        id: u.id,
        username: u.user_metadata?.username || u.email?.split("@")[0] || "User",
        email: u.email || "",
        avatarUrl: u.user_metadata?.avatar_url || null,
      };
    },
    enabled: supabaseReady,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData): Promise<AuthUser> => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("No user returned");
      return {
        id: data.user.id,
        username: data.user.user_metadata?.username || data.user.email?.split("@")[0] || "User",
        email: data.user.email || "",
        avatarUrl: data.user.user_metadata?.avatar_url || null,
      };
    },
    onSuccess: (user: AuthUser) => {
      queryClient.setQueryData(["user"], user);
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({ title: "Login successful", description: `Welcome back, ${user.username}!` });
    },
    onError: (error: Error) => {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (newUser: RegisterData): Promise<AuthUser> => {
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: { data: { username: newUser.username } },
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("No user returned");
      return {
        id: data.user.id,
        username: newUser.username,
        email: data.user.email || newUser.email,
        avatarUrl: null,
      };
    },
    onSuccess: (user: AuthUser) => {
      queryClient.setQueryData(["user"], user);
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({ title: "Account created!", description: `Welcome, ${user.username}!` });
    },
    onError: (error: Error) => {
      const isRateLimit = error.message.toLowerCase().includes("rate limit") || error.message.toLowerCase().includes("too many");
      toast({
        title: "Registration failed",
        description: isRateLimit
          ? "Too many signup attempts. In your Supabase dashboard go to Authentication → Providers → Email and turn off \"Confirm email\", then try again."
          : error.message,
        variant: "destructive",
        duration: isRateLimit ? 10000 : 5000,
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
      queryClient.setQueryData(["user"], null);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onSuccess: () => {
      toast({ title: "Logged out", description: "See you soon!" });
    },
    onError: (error: Error) => {
      toast({ title: "Logout failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading: isLoading || !supabaseReady,
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
