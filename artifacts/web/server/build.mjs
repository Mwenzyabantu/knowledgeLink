import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function buildServer() {
  const distDir = path.resolve(artifactDir, "dist-server");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "server/index.ts")],
    platform: "node",
    bundle: true,
    packages: "external",
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    external: [
      "*.node",
    ],
    sourcemap: "linked",
    // Make CJS-only packages (express, etc.) work in ESM output
    banner: {
      js: `import { createRequire as __crReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';
globalThis.require = __crReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`,
    },
  });
}

buildServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
