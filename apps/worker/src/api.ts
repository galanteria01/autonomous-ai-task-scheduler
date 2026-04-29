import type { Task, TaskStatus, UpdateTaskInput } from "@ai-kanban/types";
import { env } from "./env.js";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.BACKEND_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Backend ${res.status} ${res.statusText}: ${body}`);
  }
  return (await res.json()) as T;
}

export async function getTask(taskId: string): Promise<Task> {
  const tasks = await request<Task[]>(`/tasks`);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);
  return task;
}

export async function updateTask(
  taskId: string,
  patch: UpdateTaskInput,
): Promise<Task> {
  return request<Task>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function setStatus(taskId: string, status: TaskStatus) {
  return updateTask(taskId, { status });
}
