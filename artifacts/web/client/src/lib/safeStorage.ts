export const safeStorage = {
  getItem: (key: string): string | null => {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    try { window.localStorage.setItem(key, value); } catch {}
  },
  removeItem: (key: string): void => {
    try { window.localStorage.removeItem(key); } catch {}
  },
};
