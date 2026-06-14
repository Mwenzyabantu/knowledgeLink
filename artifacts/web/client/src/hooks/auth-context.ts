import { createContext } from "react";
import type { UseMutationResult } from "@tanstack/react-query";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
};

export type LoginData = { email: string; password: string };
export type RegisterData = { username: string; email: string; password: string };

export type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<AuthUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<AuthUser, Error, RegisterData>;
};

export const AuthContext = createContext<AuthContextType | null>(null);
