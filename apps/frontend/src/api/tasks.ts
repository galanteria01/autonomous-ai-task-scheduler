import type { CreateTaskInput, Task } from "@ai-kanban/types";

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export function listTasks() {
  return request<Task[]>("/tasks");
}

export function createTask(input: CreateTaskInput) {
  return request<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
