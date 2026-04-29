import type { Task, TaskType } from "@ai-kanban/types";

const SYSTEM_PROMPT = `You are an autonomous AI agent that completes tasks on a Kanban board.

You have access to these tools:
- fetch_url(url): fetch the visible text of a webpage
- summarize(text, maxBullets?): condense long text into a lead + bullets
- run_js(code): run a small sandboxed JS snippet for math/string manipulation

Rules:
- Use tools only when they help. Never call a tool with placeholder/fake input.
- Be concise. The final answer is shown to a human in a Kanban card.
- When fetching URLs, summarize before reasoning further if the content is long.
- Never invent URLs or facts. If a task lacks information, state what is missing.
- When done, return the final user-facing output as plain text. Do not wrap it in JSON or markdown code fences unless the task explicitly asks for it.`;

const TYPE_HINTS: Record<TaskType, string> = {
  summarize:
    "Goal: produce a clear summary. If the description includes a URL, fetch it first, then summarize.",
  research:
    "Goal: gather and synthesize information. Use fetch_url + summarize as needed and present findings.",
  generate:
    "Goal: create new content (text, ideas, code snippets) per the description.",
};

export function buildPrompt(task: Task): { system: string; prompt: string } {
  return {
    system: SYSTEM_PROMPT,
    prompt: `Task title: ${task.title}
Task type: ${task.type}
${TYPE_HINTS[task.type]}

Task description:
${task.description}

Return only the final user-facing output.`,
  };
}
