import { useCallback, useEffect, useMemo, useState } from "react";
import { TASK_STATUSES, type Task, type TaskStatus } from "@ai-kanban/types";
import { listTasks } from "../api/tasks";
import { useTaskSocket } from "../hooks/useSocket";
import { KanbanColumn } from "./KanbanColumn";

const VISIBLE_COLUMNS: TaskStatus[] = ["todo", "in_progress", "done"];

export function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTasks()
      .then(setTasks)
      .catch((e) => console.error("Failed to load tasks", e))
      .finally(() => setLoading(false));
  }, []);

  const upsert = useCallback((task: Task) => {
    setTasks((prev) => {
      const existing = prev.findIndex((t) => t.id === task.id);
      if (existing === -1) return [task, ...prev];
      const next = [...prev];
      next[existing] = task;
      return next;
    });
  }, []);

  useTaskSocket(useMemo(() => ({ onCreated: upsert, onUpdated: upsert }), [upsert]));

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
      failed: [],
    };
    for (const t of tasks) {
      const bucket = t.status === "failed" ? "done" : t.status;
      map[bucket].push(t);
    }
    return map;
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-3">
      {VISIBLE_COLUMNS.map((status) => (
        <KanbanColumn key={status} status={status} tasks={grouped[status]} />
      ))}
    </div>
  );
}
