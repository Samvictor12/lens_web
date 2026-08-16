import { useEffect, useRef } from "react";
import { buildWebSocketUrl } from "@/lib/websocketUrl";

/**
 * Subscribe to live WebSocket events and invoke `onEvent` when `types` match.
 * Reconnects automatically after disconnect.
 * @param {string|string[]} types
 * @param {(message: { type: string }) => void} onEvent
 */
export function useLiveWebSocket(types, onEvent) {
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  });

  const typesKey = Array.isArray(types) ? types.join(",") : String(types || "");

  useEffect(() => {
    const wanted = new Set(typesKey.split(",").filter(Boolean));
    if (wanted.size === 0) return undefined;

    const wsUrl = buildWebSocketUrl();
    let socket = null;
    let reconnectTimeout = null;

    const connect = () => {
      socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type && wanted.has(message.type)) {
            handlerRef.current?.(message);
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };
      socket.onclose = () => {
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [typesKey]);
}
