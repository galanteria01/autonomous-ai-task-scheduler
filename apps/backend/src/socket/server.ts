import type { Server as HTTPServer } from "node:http";
import { Server } from "socket.io";
import { SOCKET_EVENTS, type Task } from "@ai-kanban/types";
import { env } from "../env.js";

let io: Server | null = null;

export function initSocket(httpServer: HTTPServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, methods: ["GET", "POST", "PATCH"] },
  });
  io.on("connection", (socket) => {
    console.log(`[socket] client connected ${socket.id}`);
    socket.on("disconnect", () => {
      console.log(`[socket] client disconnected ${socket.id}`);
    });
  });
  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO not initialized. Call initSocket() first.");
  return io;
}

export function emitTaskCreated(task: Task) {
  getIO().emit(SOCKET_EVENTS.TASK_CREATED, task);
}

export function emitTaskUpdated(task: Task) {
  getIO().emit(SOCKET_EVENTS.TASK_UPDATED, task);
}
