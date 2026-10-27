---
name: Gemini model availability
description: Project Gemini model choices and how to interpret key/model probe failures.
---

Check Google's current Gemini model catalog before changing model IDs. A request that reaches Google's API but returns 404 can indicate the selected model is unavailable to the API project; it does not by itself mean the key is missing.

**Why:** The previous 2.5 model selection returned 404s in AI generation logs even though the function reached the Gemini endpoint.

**How to apply:** Confirm the selected model is stable and available for the project's API access, then test a real generation after deploying the Supabase Edge Functions.

As of 2026-10-27, the live probe matrix showed all five keys working with `gemini-3.6-flash` and `gemini-3.5-flash-lite`. Key 1 timed out on `gemini-3.1-flash-lite-preview` and `gemini-3.5-flash`; those results do not mean Key 1 is invalid. Use 3.6 Flash for complex reasoning/code, and 3.5 Flash-Lite for short, high-volume helper tasks and fallback. Transcription/TTS models are only relevant to Edge Functions that actually process audio.

**Why:** The app's full Flash and Flash-Lite model choices both passed the five-key probe, while Key 1 had two model-specific timeouts.

**How to apply:** Prefer those tested models for current text Edge Functions. Recheck the model catalog and key matrix when Google changes availability; do not treat an isolated timeout as proof that a key is bad.
