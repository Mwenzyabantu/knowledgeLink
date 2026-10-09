---
name: Electron runtime on Replit
description: Native Linux libraries and headless graphics behavior for Electron's Replit desktop workflow.
---

Electron's downloaded Linux binary needs desktop shared libraries supplied through Nix in Replit; missing GLib prevents launch. Install system packages through the package-management workflow rather than apt. During VNC startup, DBus and EGL/GPU errors can appear even while the local web server and WebSocket are running, so verify the actual VNC window as well as the server response.

**Why:** Replit's Linux workspace does not include all libraries expected by Electron's prebuilt binary, and headless graphics warnings do not always mean the whole app process has exited.

**How to apply:** Before debugging Electron code, check for its system libraries, then distinguish a live-but-noisy renderer from a failed launch by checking workflow state, server logs, and VNC output.
