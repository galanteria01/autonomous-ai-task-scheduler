import { useState } from "react";
import type { TaskMetadata, ToolCallLog } from "@ai-kanban/types";

function formatDuration(ms?: number): string {
  if (typeof ms !== "number") return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="font-mono text-xs text-slate-700">{value}</span>
    </div>
  );
}

function ToolCallItem({ call }: { call: ToolCallLog }) {
  const [open, setOpen] = useState(false);
  const argsPreview = truncate(formatJson(call.args).replace(/\s+/g, " "), 80);
  return (
    <li className="rounded border border-slate-200 bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-slate-50"
      >
        <div className="min-w-0 flex-1">
          <span className="font-mono font-semibold text-indigo-700">
            {call.tool}
          </span>
          <span className="ml-2 truncate text-slate-500">{argsPreview}</span>
        </div>
        <span className="text-slate-400">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-100 px-2 py-2">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400">
              args
            </div>
            <pre className="mt-1 max-h-40 overflow-auto rounded bg-slate-50 p-2 text-[11px] text-slate-700">
              {formatJson(call.args)}
            </pre>
          </div>
          {call.result !== undefined && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                result
              </div>
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-slate-50 p-2 text-[11px] text-slate-700">
                {formatJson(call.result)}
              </pre>
            </div>
          )}
          {call.error && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-rose-500">
                error
              </div>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-rose-50 p-2 text-[11px] text-rose-700">
                {call.error}
              </pre>
            </div>
          )}
          <div className="text-[10px] text-slate-400">
            {new Date(call.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </li>
  );
}

export function TaskMetadataView({
  metadata,
  failed = false,
}: {
  metadata: TaskMetadata;
  failed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const tools = metadata.toolCalls ?? [];
  const usage = metadata.usage;

  return (
    <div className="mt-3 border-t border-slate-100 pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-[11px] font-medium uppercase tracking-wide text-slate-500 hover:text-slate-700"
      >
        <span>Run details</span>
        <span>{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Duration" value={formatDuration(metadata.durationMs)} />
            <Stat label="Steps" value={String(metadata.steps ?? "—")} />
            <Stat label="Tool calls" value={String(tools.length)} />
            <Stat label="Attempt" value={String(metadata.attempts ?? "—")} />
          </div>

          {(usage?.inputTokens !== undefined ||
            usage?.outputTokens !== undefined ||
            usage?.totalTokens !== undefined) && (
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Tokens in" value={String(usage?.inputTokens ?? "—")} />
              <Stat label="Tokens out" value={String(usage?.outputTokens ?? "—")} />
              <Stat label="Total" value={String(usage?.totalTokens ?? "—")} />
            </div>
          )}

          {metadata.model && (
            <Stat label="Model" value={metadata.model} />
          )}

          {failed && metadata.error && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-rose-500">
                Error{metadata.error.name ? ` · ${metadata.error.name}` : ""}
              </div>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-rose-50 p-2 text-[11px] text-rose-700">
                {metadata.error.message}
              </pre>
            </div>
          )}

          {tools.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                Tool timeline
              </div>
              <ol className="space-y-1">
                {tools.map((c, i) => (
                  <ToolCallItem key={`${c.tool}-${i}`} call={c} />
                ))}
              </ol>
            </div>
          )}

          {metadata.finishReason && (
            <div className="text-[10px] text-slate-400">
              Finish reason: <span className="font-mono">{metadata.finishReason}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
