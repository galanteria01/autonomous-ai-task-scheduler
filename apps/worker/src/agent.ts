import { generateText, stepCountIs, type ToolSet } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { agentTools } from "@ai-kanban/tools";
import type { Task, TokenUsage, ToolCallLog } from "@ai-kanban/types";
import { env } from "./env.js";
import { buildPrompt } from "./prompts.js";

const openai = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_BASE_URL,
});

export interface AgentResult {
  text: string;
  steps: number;
  toolCalls: ToolCallLog[];
  usage?: TokenUsage;
  finishReason?: string;
  model: string;
}

export interface AgentRunContext {
  toolCalls: ToolCallLog[];
  model: string;
  /**
   * Optional extra tools merged with the built-in agent tools for this run
   * (e.g. macOS or coding MCP tools gated by task.type). Built-in tools take
   * precedence on key collision so MCP servers can't accidentally shadow them.
   */
  extraTools?: ToolSet;
  /**
   * Per-run max-steps override. Defaults to env.AGENT_MAX_STEPS. Coding tasks
   * should pass a higher value (env.AGENT_MAX_STEPS_CODE) since real edit
   * loops need many tool calls.
   */
  maxSteps?: number;
}

export async function runAgent(
  task: Task,
  ctx: AgentRunContext,
): Promise<AgentResult> {
  const { system, prompt } = buildPrompt(task);
  const tools: ToolSet = { ...(ctx.extraTools ?? {}), ...agentTools };

  const controller = new AbortController();
  // Per-step timeout: reset every time a step finishes. Aborts only if a
  // single step (model call + tool execution) exceeds the budget.
  let stepTimeout: NodeJS.Timeout = setTimeout(
    () => controller.abort(),
    env.AGENT_TIMEOUT_MS,
  );
  const armStepTimeout = () => {
    clearTimeout(stepTimeout);
    stepTimeout = setTimeout(
      () => controller.abort(),
      env.AGENT_TIMEOUT_MS,
    );
  };

  try {
    const result = await generateText({
      model: openai.chat(ctx.model),
      system,
      prompt,
      tools,
      stopWhen: stepCountIs(ctx.maxSteps ?? env.AGENT_MAX_STEPS),
      abortSignal: controller.signal,
      onStepFinish: ({ toolCalls: tc, toolResults }) => {
        armStepTimeout();
        for (const call of tc) {
          const matching = toolResults.find(
            (r) => r.toolCallId === call.toolCallId,
          );
          const log: ToolCallLog = {
            tool: call.toolName,
            args: call.input,
            result: matching?.output,
            timestamp: new Date().toISOString(),
          };
          ctx.toolCalls.push(log);
          console.log(
            `[agent] tool=${call.toolName} args=${JSON.stringify(call.input).slice(0, 200)}`,
          );
        }
      },
    });

    return {
      text: result.text,
      steps: result.steps.length,
      toolCalls: ctx.toolCalls,
      usage: result.usage,
      finishReason: String(result.finishReason ?? ""),
      model: ctx.model,
    };
  } finally {
    clearTimeout(stepTimeout);
  }
}
