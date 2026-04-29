import { useState } from "react";
import { KanbanBoard } from "./components/KanbanBoard";
import { CreateTaskModal } from "./components/CreateTaskModal";

export default function App() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">AI Kanban</h1>
            <p className="text-xs text-slate-500">
              Autonomous agents complete your tasks in the background
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            + New task
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 overflow-hidden p-6">
        <KanbanBoard />
      </main>

      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
