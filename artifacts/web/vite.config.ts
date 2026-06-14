import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  // BASE_PATH="./" when building for Electron (file:// loads need relative paths)
  base: process.env.BASE_PATH || "/",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    // Force a single copy of React and React Query across all workspace packages.
    // Without this, the pnpm workspace can resolve two separate instances — one
    // from the root node_modules and one from a package's own node_modules —
    // which causes "Invalid hook call" and "Cannot read properties of null
    // (reading 'useContext')" errors.
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "@tanstack/react-query",
    ],
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    allowedHosts: true,
    fs: {
      strict: false,
    },
  },
  define: {
    // Forward the server-side SUPABASE_ANON_KEY into the Vite bundle so the
    // client can access it as import.meta.env.VITE_SUPABASE_ANON_KEY without
    // requiring a separately-named VITE_* secret.
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? ""
    ),
  },
  optimizeDeps: {
    // Pre-bundle these together so the optimizer never splits them across
    // separate chunks (which is another source of the duplicate-React problem).
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "@tanstack/react-query",
    ],
  },
});
