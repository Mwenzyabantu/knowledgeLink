import { useEffect, useRef, useState } from "react";

export function useKeepAlive() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    function connect() {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log("WS: Connected for keep-alive");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "pong") {
            // Heartbeat received
          }
        } catch (e) {
          // Ignore
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log("WS: Disconnected, retrying in 5s...");
        setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        console.error("WS: Error", err);
        ws.close();
      };
    }

    connect();

    const pingInterval = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return isConnected;
}
