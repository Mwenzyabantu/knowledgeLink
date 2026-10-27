import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { UserPersonalization } from "@shared/schema";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  ...props
}: ThemeProviderProps) {
  const { user } = useAuth();
  const { data: personalization } = useQuery<UserPersonalization>({
    queryKey: ["/api/personalization"],
    enabled: !!user,
  });

  const updatePersonalization = useMutation({
    mutationFn: async (theme: Theme) => {
      const res = await apiRequest("PATCH", "/api/personalization", { theme });
      return (await res.json()) as UserPersonalization;
    },
    onSuccess: (savedPersonalization) => {
      queryClient.setQueryData(
        ["/api/personalization"],
        savedPersonalization,
      );
      queryClient.setQueryData(
        ["/api/user-personalization"],
        savedPersonalization,
      );
    },
  });

  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  // Sync with personalization once data is available
  useEffect(() => {
    if (personalization?.theme) {
      setThemeState(personalization.theme as Theme);
      localStorage.setItem(storageKey, personalization.theme);
    }
  }, [personalization, storageKey]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const setTheme = (theme: Theme) => {
    setThemeState(theme);
    localStorage.setItem(storageKey, theme);
    if (user) updatePersonalization.mutate(theme);
  };

  const value = {
    theme,
    setTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
