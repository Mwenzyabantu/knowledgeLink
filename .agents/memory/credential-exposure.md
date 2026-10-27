---
name: Public repository credential exposure
description: The upstream KnowledgeLink repository's tracked `.replit` contained literal provider and database credentials.
---

Do not copy credential values from the upstream repository into this Repl. Its public `.replit` contained Gemini and Groq API credentials and a PostgreSQL connection string. The imported working copy omits the inline credential section, but the public repository history remains exposed.

**Why:** Publicly committed credentials must be treated as compromised even after removing them from the local working copy.

**How to apply:** Revoke or rotate the exposed values with their providers, then configure fresh values through Replit Secrets. Never restore the upstream inline credential section.
