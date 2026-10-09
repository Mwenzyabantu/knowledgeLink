---
name: Gemini model availability
description: Diagnose model-level Gemini 404s separately from missing API credentials.
---

Check Google's current Gemini model catalog before changing model IDs. A request that reaches Google's API but returns 404 can indicate the selected model is unavailable to the API project; it does not by itself mean the key is missing.

**Why:** The previous 2.5 model selection returned 404s in AI generation logs even though the function reached the Gemini endpoint.

**How to apply:** Confirm the selected model is stable and available for the project's API access, then test a real generation after deploying the Supabase Edge Functions.
