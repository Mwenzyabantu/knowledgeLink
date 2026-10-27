---
name: Protected root imports
description: What to preserve when copying a repository over a Replit project root.
---

When importing a repository into an existing Replit project, copy the repository's source files without replacing the project's `.git` directory. Preserve Replit-managed workspace directories such as `.local`, `.cache`, and `.conversation`.

**Why:** Root operations that alter `.git` are blocked by Replit's safety guard and can interfere with project Git setup.

**How to apply:** For an explicit source-file replacement, exclude `.git` and Replit-managed directories from the copy. Replace Git history only when the user explicitly requests that separately.
