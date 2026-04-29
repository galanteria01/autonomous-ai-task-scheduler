import type { Task, TaskStatus } from "@ai-kanban/types";
import { TaskCard } from "./TaskCard";

const COLUMN_STYLES: Record<TaskStatus, { dot: string; label: string }> = {
  todo: { dot: "bg-slate-400", label: "Todo" },
  in_progress: { dot: "bg-indigo-500", label: "In Progress" },
  done: { dot: "bg-emerald-500", label: "Done" },
  failed: { dot: "bg-rose-500", label: "Failed" },
};

export function KanbanColumn({
  status,
  tasks,
}: {
  status: TaskStatus;
  tasks: Task[];
}) {
  const meta = COLUMN_STYLES[status];
  return (
    <div className="flex h-full min-w-0 flex-col rounded-xl bg-slate-100/70 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          <h2 className="text-sm font-semibold text-slate-700">{meta.label}</h2>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 p-6 text-xs text-slate-400">
            No tasks
          </div>
        ) : (
          tasks.map((t) => <TaskCard key={t.id} task={t} />)
        )}
      </div>
    </div>
  );
}
