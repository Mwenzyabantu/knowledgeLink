import type { Express, RequestHandler } from "express";
import { storage } from "../supabase-storage";
import {
  createRequestSupabaseClient,
  runWithSupabaseContext,
} from "../supabase-context";

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      email: string;
      avatarUrl: string | null;
    }
  }
}

export function setupAuth(app: Express) {
  const authenticateRequest: RequestHandler = (req, _res, next) => {
    const authorization = req.get("authorization") ?? "";
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    const client = createRequestSupabaseClient(token);
    const context = { client, userId: null as string | null };

    req.isAuthenticated = (() => Boolean(req.user)) as typeof req.isAuthenticated;

    runWithSupabaseContext(context, () => {
      void (async () => {
        if (token) {
          const { data, error } = await client.auth.getUser(token);
          if (!error && data.user) {
            const authUser = data.user;
            const metadata = authUser.user_metadata ?? {};
            context.userId = authUser.id;
            req.user = {
              id: authUser.id,
              username:
                typeof metadata.username === "string"
                  ? metadata.username
                  : authUser.email?.split("@")[0] ?? "user",
              email: authUser.email ?? "",
              avatarUrl:
                typeof metadata.avatar_url === "string"
                  ? metadata.avatar_url
                  : null,
            };
          }
        }
        next();
      })().catch(next);
    });
  };

  app.use(authenticateRequest);

  app.get("/api/user", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const profile = await storage.getUser(req.user!.id);
      res.json(profile ?? req.user);
    } catch (error) {
      next(error);
    }
  });
}
