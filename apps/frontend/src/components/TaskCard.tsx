import React, { useState } from "react";
import type { Task } from "@ai-kanban/types";
import { deleteTask, rerunTask, retryTask } from "../api/tasks";
import { TaskMetadataView } from "./TaskMetadata";
import { TaskContextMenu } from "./TaskContextMenu";

const TYPE_LABEL: Record<Task["type"], string> = {
  summarize: "Summarize",
  research: "Research",
  generate: "Generate",
  mac_action: "Mac Action",
  code: "Code",
};

const TYPE_BADGE: Record<Task["type"], string> = {
  summarize: "bg-sky-100 text-sky-800 ring-sky-200",
  research: "bg-violet-100 text-violet-800 ring-violet-200",
  generate: "bg-amber-100 text-amber-800 ring-amber-200",
  mac_action: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  code: "bg-slate-200 text-slate-800 ring-slate-300",
};

export function TaskCard({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const isInProgress = task.status === "in_progress";
  const isFailed = task.status === "failed";
  const isDone = task.status === "done";
  const showMetadata = (isDone || isFailed) && task.metadata != null;

  const handleRetry = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      await retryTask(task.id);
    } catch (e) {
      setRetryError(e instanceof Error ? e.message : "Failed to retry");
    } finally {
      setRetrying(false);
    }
  };

  const handleRerun = async () => {
    setActionError(null);
    try {
      await rerunTask(task.id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to rerun");
    }
  };

  const handleDelete = async () => {
    setActionError(null);
    try {
      await deleteTask(task.id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      onContextMenu={handleContextMenu}
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

      {showMetadata && task.metadata && (
        <TaskMetadataView metadata={task.metadata} failed={isFailed} />
      )}

      {isFailed && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-rose-100 pt-2">
          {retryError ? (
            <span className="text-[11px] text-rose-600">{retryError}</span>
          ) : (
            <span className="text-[11px] text-rose-600">Agent failed</span>
          )}
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
          >
            {retrying ? "Retrying..." : "Retry"}
          </button>
        </div>
      )}

      {actionError && (
        <p className="mt-2 rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
          {actionError}
        </p>
      )}

      <div className="mt-2 text-[10px] text-slate-400">
        {new Date(task.createdAt).toLocaleString()}
      </div>

      {menuPos && (
        <TaskContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuPos(null)}
          items={[
            {
              id: "rerun",
              label: isInProgress ? "Rerun (running)" : "Rerun",
              disabled: isInProgress,
              onSelect: handleRerun,
            },
            {
              id: "delete",
              label: "Delete",
              danger: true,
              onSelect: handleDelete,
            },
          ]}
        />
      )}
    </div>
  );
}
