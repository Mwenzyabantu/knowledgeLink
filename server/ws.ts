import { type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { log } from "./logger";

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;

    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws) => {
    log("WS: Client connected");

    // Ping/pong to keep connection alive
    const keepAlive = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      } catch (e) {
        // Ignore non-json messages
      }
    });

    ws.on("close", () => {
      log("WS: Client disconnected");
      clearInterval(keepAlive);
    });

    ws.on("error", (err) => {
      console.error("WS: Error:", err);
    });
  });

  return wss;
}
