# KnowledgeLink

## Desktop installers from GitHub Actions

Every push starts Linux, Windows, and macOS desktop builds. When the workflow completes, download the installer for your system from the **Build Desktop Installers** run under the repository’s **Actions** tab. Each artifact is kept for 30 days.

Before the first push, add these repository secrets under **Settings → Secrets and variables → Actions**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

These values configure the app’s Supabase connection. The workflow does not need or package `SUPABASE_ACCESS_TOKEN` or other privileged server credentials. Desktop builds need internet access to use Supabase.

The macOS DMG is unsigned. Public macOS distribution will require Apple signing and notarization.

To launch the desktop app locally, run `npm run desktop:dev`. To build a package for the current operating system, run `npm run desktop:dist`.
