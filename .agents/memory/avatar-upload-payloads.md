---
name: Avatar upload payloads
description: Size limits and storage considerations for profile photos.
---

Never place base64 profile photos in Supabase Auth user metadata: the photo is copied into session claims and inflates every bearer token. Keep inline profile-image writes below the app's JSON request limit.

**Why:** A compressed image may fit in the signup request body yet still make the resulting access token too large for HTTP request-header limits. Large originals can also exceed Supabase Auth's 1 MiB body limit or Express's smaller JSON limit.

**How to apply:** Resize and compress photos for profile-record writes, never Auth metadata. Prefer Supabase Storage plus a URL if photo sizes, formats, or volume grow.
