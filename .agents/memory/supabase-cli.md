---
name: Supabase CLI workflow
description: The user's instruction for Supabase access in this workspace.
---

Use the Supabase CLI for Supabase work when needed; do not rely on a Supabase MCP connection in this workspace. Keep CLI credentials in Replit Secrets.

Before pushing migrations from an imported repository, confirm the app URL matches the configured project ref, run `db push --dry-run`, and inspect each legacy migration against the remote migration history and schema. Do not repair migration history blindly.

**Why:** An imported Supabase project can have an established live schema but no recorded migration history, so a routine push may replay older migrations, including destructive functions that are only defined—not executed—by the migration.

**How to apply:** Use read-only schema checks to distinguish missing structures from missing migration records. Apply only after confirming the target and understanding every migration that will run.
