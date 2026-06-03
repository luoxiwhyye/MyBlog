/// <reference lib="webworker" />

import type { ToolProcessPayload, ToolProcessResult } from "~/types/tool";
import { processTool } from "~/utils/tools/processor";

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

  try {
    const result = await processTool(payload);
    const response: WorkerResponse = {
      id,
      ok: true,
      result,
    };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : "处理失败，请稍后重试。",
    };
    self.postMessage(response);
  }
};
