/// <reference lib="webworker" />

import type { ToolProcessPayload, ToolProcessResult } from "../../types/tool";
import { processTool } from "./processor";

interface WorkerRequest {
  id: string;
  payload: ToolProcessPayload;
}

interface WorkerSuccessResponse {
  id: string;
  ok: true;
  result: ToolProcessResult;
}

interface WorkerErrorResponse {
  id: string;
  ok: false;
  error: string;
}

type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, payload } = event.data;
  console.log("[Worker] received message", { id, toolId: payload.toolId });

  try {
    const result = await processTool(payload);
    console.log("[Worker] processTool success", {
      id,
      output: result.output.substring(0, 100),
    });
    const response: WorkerResponse = {
      id,
      ok: true,
      result,
    };
    self.postMessage(response);
  } catch (error) {
    console.error("[Worker] processTool error", error);
    const response: WorkerResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : "处理失败，请稍后重试。",
    };
    self.postMessage(response);
  }
};
