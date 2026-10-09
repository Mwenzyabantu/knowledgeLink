import { chmod, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const requiredKeys = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
];
const missingKeys = requiredKeys.filter((key) => !process.env[key]?.trim());

if (missingKeys.length > 0) {
  console.error(
    `Desktop setup requires these environment values: ${missingKeys.join(", ")}. Set them locally or as GitHub Actions repository secrets.`,
  );
  process.exit(1);
}

const supabaseUrl = new URL(process.env.VITE_SUPABASE_URL);
if (supabaseUrl.protocol !== "https:" && supabaseUrl.protocol !== "http:") {
  console.error("VITE_SUPABASE_URL must use http or https.");
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(here, "runtime-config.json");
const config = {
  VITE_SUPABASE_URL: supabaseUrl.toString(),
  VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
};

await writeFile(configPath, JSON.stringify(config));
if (process.platform !== "win32") {
  await chmod(configPath, 0o600);
}
console.log("Desktop runtime configuration prepared.");
