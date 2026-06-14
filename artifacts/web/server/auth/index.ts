import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import express, { Express } from "express";
import session from "express-session";
import { randomBytes } from "crypto";
import { storage } from "../storage";
import { supabaseAdmin } from "../db";
import { supabaseAuth } from "./supabase";
import type { User } from "@shared/schema";
import { getTokenFromHeader, verifySupabaseToken } from "./supabase";

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      email: string;
      password?: string | null;
      avatarUrl: string | null;
      createdAt: Date;
    }
    interface Request {
      supabaseUser?: any;
    }
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "stable-session-secret-123",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    rolling: true,
    cookie: {
      secure: false,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    },
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings) as any);
  app.use(passport.initialize() as any);
  app.use(passport.session() as any);

  // Supabase token middleware
  app.use(async (req: any, res, next) => {
    const token = getTokenFromHeader(req);
    if (token) {
      try {
        const supabaseUser = await verifySupabaseToken(token);
        if (supabaseUser) {
          req.supabaseUser = supabaseUser;
        }
      } catch {
        // Token invalid — continue
      }
    }
    next();
  });

  // Bridge: Supabase JWT → local session (creates profile if needed)
  app.use(async (req: any, res, next) => {
    if (req.supabaseUser && !req.isAuthenticated()) {
      try {
        let dbUser = await storage.getUserByEmail(req.supabaseUser.email);
        if (!dbUser) {
          const username =
            req.supabaseUser.user_metadata?.username ||
            req.supabaseUser.email?.split("@")[0] ||
            `user_${Date.now()}`;
          dbUser = await storage.createUser({
            id: req.supabaseUser.id,
            username,
            email: req.supabaseUser.email,
            password: randomBytes(32).toString("hex"),
          });
          try {
            await storage.createUserPersonalization({
              userId: dbUser.id,
              careerGoals: [],
              skillsFocus: [],
              preferredVoice: "",
              theme: "system",
              currentCareer: null,
              aspiringCareer: null,
              desiredRole: null,
              targetIndustry: null,
              yearsOfExperience: null,
              location: null,
              locationLastUpdated: null,
            });
            await storage.createUserSettings({
              userId: dbUser.id,
              enableConceptCountGeneration: true,
              enableDailyGeneration: true,
              conceptCountThreshold: 3,
              dailyGenerationFrequencyDays: 1,
            });
          } catch {
            // Non-fatal
          }
        }
        if (dbUser) {
          req.user = dbUser;
          req.isAuthenticated = () => true;
        }
      } catch {
        // Continue without bridge
      }
    }
    next();
  });

  // Passport local strategy — verifies credentials via Supabase Auth
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Look up the profile by username to get the email
        const dbUser = await storage.getUserByUsername(username);
        if (!dbUser) {
          return done(null, false, { message: "Incorrect username." });
        }
        // Verify password through Supabase Auth
        const { data, error } = await supabaseAuth.auth.signInWithPassword({
          email: dbUser.email,
          password,
        });
        if (error || !data.user) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, dbUser);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id); // UUID string
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) return done(null, false);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // ── Auth routes ────────────────────────────────────────────

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email } = req.body;
      if (!username || !password || !email) {
        return res
          .status(400)
          .send("Username, password, and email are required");
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).send("Email already exists");
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { username },
        });

      if (authError || !authData.user) {
        return res
          .status(400)
          .send(authError?.message || "Failed to create auth user");
      }

      // Create profile
      const user = await storage.createUser({
        id: authData.user.id,
        username,
        email,
        password,
      });

      // Initialize defaults
      try {
        await storage.createUserPersonalization({
          userId: user.id,
          careerGoals: [],
          skillsFocus: [],
          preferredVoice: "",
          theme: "system",
          currentCareer: null,
          aspiringCareer: null,
          desiredRole: null,
          targetIndustry: null,
          yearsOfExperience: null,
          location: null,
          locationLastUpdated: null,
        });
        await storage.createUserSettings({
          userId: user.id,
          enableConceptCountGeneration: true,
          enableDailyGeneration: true,
          conceptCountThreshold: 3,
          dailyGenerationFrequencyDays: 1,
        });
      } catch (initErr) {
        console.error("Failed to initialize user data:", initErr);
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req: any, res) => {
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
    if (req.isAuthenticated()) return res.json(req.user);
    return res.status(401).json({ message: "Unauthorized" });
  });
}
