---
name: Windows Electron listener
description: Windows launch failure in KnowledgeLink's packaged Electron app when the local Node server requests socket reuse.
---

The packaged Windows app's local Express server exited with `ENOTSUP` while binding `127.0.0.1` when `server.listen()` received `reusePort: true`. The desktop wrapper chooses an ephemeral localhost port; this error is about the unsupported socket option, not necessarily a port conflict.

**Why:** The Windows runtime bundled with this Electron build rejected the reuse option, so the server exited before the BrowserWindow could load.

**How to apply:** When diagnosing a Windows desktop launch that logs `listen ENOTSUP`, inspect the server's listen options and omit `reusePort` on Windows (or omit it entirely) before producing a replacement installer.
