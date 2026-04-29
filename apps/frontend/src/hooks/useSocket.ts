import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_EVENTS, type Task } from "@ai-kanban/types";
import { API_URL } from "../api/tasks";

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, { transports: ["websocket", "polling"] });
  }
  return socket;
}

export function useTaskSocket(handlers: {
  onCreated?: (task: Task) => void;
  onUpdated?: (task: Task) => void;
}) {
  useEffect(() => {
    const s = getSocket();
    const created = (t: Task) => handlers.onCreated?.(t);
    const updated = (t: Task) => handlers.onUpdated?.(t);
    s.on(SOCKET_EVENTS.TASK_CREATED, created);
    s.on(SOCKET_EVENTS.TASK_UPDATED, updated);
    return () => {
      s.off(SOCKET_EVENTS.TASK_CREATED, created);
      s.off(SOCKET_EVENTS.TASK_UPDATED, updated);
    };
  }, [handlers]);
}
