import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { agentTools } from "@ai-kanban/tools";
import type { Task, ToolCallLog } from "@ai-kanban/types";
import { env } from "./env.js";
import { buildPrompt } from "./prompts.js";

export interface AgentResult {
  text: string;
  steps: number;
  toolCalls: ToolCallLog[];
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
}

export async function runAgent(task: Task): Promise<AgentResult> {
  const { system, prompt } = buildPrompt(task);
  const toolCalls: ToolCallLog[] = [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AGENT_TIMEOUT_MS);

  try {
    const result = await generateText({
      model: openai(env.OPENAI_MODEL),
      system,
      prompt,
      tools: agentTools,
      stopWhen: stepCountIs(env.AGENT_MAX_STEPS),
      abortSignal: controller.signal,
      onStepFinish: ({ toolCalls: tc, toolResults }) => {
        for (const call of tc) {
          const matching = toolResults.find(
            (r) => r.toolCallId === call.toolCallId,
          );
          toolCalls.push({
            tool: call.toolName,
            args: call.input,
            result: matching?.output,
            timestamp: new Date().toISOString(),
          });
          console.log(
            `[agent] tool=${call.toolName} args=${JSON.stringify(call.input).slice(0, 200)}`,
          );
        }
      },
    });

    return {
      text: result.text,
      steps: result.steps.length,
      toolCalls,
      usage: result.usage,
    };
  } finally {
    clearTimeout(timeout);
  }
}
