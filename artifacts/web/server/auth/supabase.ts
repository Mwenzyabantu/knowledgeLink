import { createClient } from "@supabase/supabase-js";
import { Express } from "express";

const SUPABASE_URL = "https://hzhweoiwfldtmwphdkzr.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aHdlb2l3ZmxkdG13cGhka3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODk4NjgsImV4cCI6MjA5NTc2NTg2OH0.XNoUCjNM0-Wf4eYdPjVy3w3qHBNReE6RLOIY-K9TfIk";

export const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function verifySupabaseToken(token: string) {
  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }
  return data.user;
}

export function getTokenFromHeader(req: {
  headers: { authorization?: string };
}): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return null;
}

export function setupSupabaseAuthMiddleware(app: Express) {
  app.use(async (req: any, res, next) => {
    const token = getTokenFromHeader(req);
    if (token) {
      try {
        const user = await verifySupabaseToken(token);
        if (user) {
          req.supabaseUser = user;
        }
      } catch {
        // Token invalid, continue as anonymous
      }
    }
    next();
  });

  app.get("/api/user", async (req: any, res) => {
    if (req.supabaseUser) {
      return res.json({
        id: req.supabaseUser.id,
        email: req.supabaseUser.email,
        username:
          req.supabaseUser.user_metadata?.username ||
          req.supabaseUser.email?.split("@")[0] ||
          "User",
        avatarUrl: req.supabaseUser.user_metadata?.avatar_url,
      });
    }
    if (req.isAuthenticated && req.isAuthenticated()) {
      return res.json(req.user);
    }
    return res.status(401).json({ message: "Unauthorized" });
  });
}
