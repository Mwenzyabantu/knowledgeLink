const PREFS_KEY = "kl_user_prefs";

function safeRead(key: string): any {
  try { return JSON.parse(window.localStorage.getItem(key) || "{}"); } catch { return {}; }
}

function safeWrite(key: string, value: any): void {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export const localStorage = {
  concepts: {
    getAll: (): any[] => [],
    setAll: (_data: any[]): void => {},
  },
  projects: {
    getAll: (): any[] => [],
    setAll: (_data: any[]): void => {},
    delete: (_id: string): void => {},
  },
  ideas: {
    getAll: (): any[] => [],
    setAll: (_data: any[]): void => {},
  },
  chats: {
    getAll: (): any[] => [],
    add: (title: string, _messages: any[]): { id: string; title: string; messages: any[] } => ({
      id: crypto.randomUUID(),
      title,
      messages: [],
    }),
    delete: (_id: string): void => {},
  },
  prefs: {
    get: (): any => safeRead(PREFS_KEY),
    set: (data: any): void => safeWrite(PREFS_KEY, data),
  },
};
