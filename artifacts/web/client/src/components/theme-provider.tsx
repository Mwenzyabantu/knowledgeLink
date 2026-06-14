import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { localStorage as lsService } from "@/lib/services/localStorage";
import { safeStorage } from "@/lib/safeStorage";
import type { UserPersonalization } from "@shared/schema";
import { ThemeProviderContext, type Theme } from "./theme-context";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  ...props
}: ThemeProviderProps) {
  const { data: personalization } = useQuery<UserPersonalization>({
    queryKey: ["/api/user-personalization"],
  });

  const updatePersonalization = useMutation({
    mutationFn: async (theme: Theme) => {
      const prefs = lsService.prefs.get();
      lsService.prefs.set({
        ...prefs,
        personalization: {
          ...(prefs.personalization || {}),
          theme,
        },
      });
      return { theme };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-personalization"] });
    },
  });

  const [theme, setThemeState] = useState<Theme>(
    () => (safeStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  useEffect(() => {
    if (personalization?.theme) {
      setThemeState(personalization.theme as Theme);
      safeStorage.setItem(storageKey, personalization.theme);
    }
  }, [personalization, storageKey]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const setTheme = (theme: Theme) => {
    setThemeState(theme);
    safeStorage.setItem(storageKey, theme);
    updatePersonalization.mutate(theme);
  };

  return (
    <ThemeProviderContext.Provider {...props} value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
