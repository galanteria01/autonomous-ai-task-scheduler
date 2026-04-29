import { useState } from "react";
import type { Task } from "@ai-kanban/types";

const TYPE_LABEL: Record<Task["type"], string> = {
  summarize: "Summarize",
  research: "Research",
  generate: "Generate",
};

const TYPE_BADGE: Record<Task["type"], string> = {
  summarize: "bg-sky-100 text-sky-800 ring-sky-200",
  research: "bg-violet-100 text-violet-800 ring-violet-200",
  generate: "bg-amber-100 text-amber-800 ring-amber-200",
};

export function TaskCard({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const isInProgress = task.status === "in_progress";
  const isFailed = task.status === "failed";

  return (
    <div
      className={`group rounded-lg border bg-white p-3 shadow-sm transition hover:shadow-md ${
        isInProgress ? "border-indigo-300 ring-1 ring-indigo-200" : "border-slate-200"
      } ${isFailed ? "border-rose-300 ring-1 ring-rose-200" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug text-slate-900">
          {task.title}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset ${TYPE_BADGE[task.type]}`}
        >
          {TYPE_LABEL[task.type]}
        </span>
      </div>

      <p className="mt-1.5 line-clamp-3 text-xs text-slate-600">
        {task.description}
      </p>

      {isInProgress && (
        <div className="mt-3 flex items-center gap-2 text-xs text-indigo-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          </span>
          Agent working...
        </div>
      )}

      {task.output && (
        <div className="mt-3 border-t border-slate-100 pt-2">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between text-[11px] font-medium uppercase tracking-wide text-slate-500 hover:text-slate-700"
          >
            <span>{isFailed ? "Error" : "Agent output"}</span>
            <span>{open ? "−" : "+"}</span>
          </button>
          {open && (
            <pre
              className={`mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs ${
                isFailed ? "text-rose-700" : "text-slate-700"
              }`}
            >
              {task.output}
            </pre>
          )}
        </div>
      )}

      <div className="mt-2 text-[10px] text-slate-400">
        {new Date(task.createdAt).toLocaleString()}
      </div>
    </div>
  );
}
