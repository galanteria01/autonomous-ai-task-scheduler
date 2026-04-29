import { useState, type FormEvent } from "react";
import { TASK_TYPES, type TaskType } from "@ai-kanban/types";
import { createTask } from "../api/tasks";

export function CreateTaskModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>("summarize");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createTask({ title: title.trim(), description: description.trim(), type });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">New task</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-700">Title</span>
            <input
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Summarize an article and write a tweet"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-700">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TaskType)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-700">Description</span>
            <textarea
              required
              rows={5}
              maxLength={4000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="What should the agent do? Include URLs if relevant."
            />
          </label>

          {error && (
            <p className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !title.trim() || !description.trim()}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
          >
            {submitting ? "Creating..." : "Create & Run"}
          </button>
        </div>
      </form>
    </div>
  );
}
