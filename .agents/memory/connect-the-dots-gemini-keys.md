---
name: Connect-the-Dots Gemini keys
description: Key priority and isolation requirements for the Connect-the-Dots Edge Function.
---

The standalone Connect-the-Dots Edge Function must try `GEMINI_API_KEY_4` first and fall back to `GEMINI_API_KEY_3` when key 4 is exhausted. Keep key 4 out of the shared Gemini key pool so other AI features do not consume this feature-specific key.

**Why:** The user designated key 4 for Connect-the-Dots and key 3 as its fallback.

**How to apply:** Preserve the 4-to-3 order and key 4 isolation when changing or redeploying the Connect-the-Dots function or shared Gemini utilities.
