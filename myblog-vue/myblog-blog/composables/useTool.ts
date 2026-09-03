import { ElMessage } from "element-plus";
import {
  buildDefaultToolInputs,
  buildDefaultToolOptions,
  getToolPath,
} from "~/config/tools";
import type {
  ToolInputValues,
  ToolMeta,
  ToolOptionValues,
  ToolProcessPayload,
  ToolProcessResult,
  ToolState,
} from "~/types/tool";
import { processTool } from "~/utils/tools/processor";

interface UseToolOptions {
  debounceMs?: number;
  onProcess?: (result: ToolProcessResult) => void;
}

interface PendingWorkerRequest {
  resolve: (value: ToolProcessResult) => void;
  reject: (reason?: unknown) => void;
}

interface WorkerRequestEnvelope {
  id: string;
  payload: ToolProcessPayload;
}

interface WorkerSuccessEnvelope {
  id: string;
  ok: true;
  result: ToolProcessResult;
}

interface WorkerErrorEnvelope {
  id: string;
  ok: false;
  error: string;
}

type WorkerResponseEnvelope = WorkerSuccessEnvelope | WorkerErrorEnvelope;

const textEncoder = new TextEncoder();
let sharedWorker: Worker | null = null;
const workerPendingMap = new Map<string, PendingWorkerRequest>();

const supportsRequestIdleCallback = () => {
  return import.meta.client && "requestIdleCallback" in window;
};

const getPersistKey = (tool: ToolMeta) =>
  `myblog:tool:${tool.category}:${tool.id}`;

const ensureWorker = () => {
  if (!import.meta.client || typeof Worker === "undefined") {
    return null;
  }

  if (!sharedWorker) {
    sharedWorker = new Worker(
      new URL("../utils/tools/processor.worker.ts", import.meta.url),
      {
        type: "module",
      },
    );

    sharedWorker.addEventListener(
      "message",
      (event: MessageEvent<WorkerResponseEnvelope>) => {
        const response = event.data;
        const pendingRequest = workerPendingMap.get(response.id);
        if (!pendingRequest) {
          return;
        }

        workerPendingMap.delete(response.id);

        if (response.ok) {
          pendingRequest.resolve(response.result);
          return;
        }

        pendingRequest.reject(new Error(response.error));
      },
    );

    sharedWorker.addEventListener("error", (event) => {
      const error = new Error(event.message || "工具 Worker 初始化失败");
      for (const request of workerPendingMap.values()) {
        request.reject(error);
      }
      workerPendingMap.clear();
      sharedWorker = null;
    });
  }

  return sharedWorker;
};

const executeWithWorker = (payload: ToolProcessPayload) => {
  const worker = ensureWorker();
  if (!worker) {
    return Promise.reject(new Error("当前环境不支持 Worker。"));
  }

  const requestId = `${payload.toolId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return new Promise<ToolProcessResult>((resolve, reject) => {
    workerPendingMap.set(requestId, { resolve, reject });

    const envelope: WorkerRequestEnvelope = {
      id: requestId,
      payload,
    };

    worker.postMessage(envelope);
  });
};

const executeInIdleTime = (payload: ToolProcessPayload) => {
  return new Promise<ToolProcessResult>((resolve, reject) => {
    const run = () => {
      processTool(payload).then(resolve).catch(reject);
    };

    if (supportsRequestIdleCallback()) {
      window.requestIdleCallback(
        () => {
          void run();
        },
        { timeout: 500 },
      );
      return;
    }

    window.setTimeout(() => {
      void run();
    }, 0);
  });
};

const cloneInputs = (value: ToolInputValues) => ({ ...value });
const cloneOptions = (value: ToolOptionValues) => ({ ...value });
const mergeToolOptions = (
  base: ToolOptionValues,
  override?: Partial<ToolOptionValues>,
): ToolOptionValues => {
  if (!override) {
    return base;
  }

  return Object.fromEntries(
    Object.entries({ ...base, ...override }).filter(
      ([, value]) => value !== undefined,
    ),
  ) as ToolOptionValues;
};

export const useTool = (tool: ToolMeta, options: UseToolOptions = {}) => {
  const primaryInputKey = tool.inputs[0]?.key ?? "content";
  const debounceMs = options.debounceMs ?? 300;
  const inputs = ref<ToolInputValues>(buildDefaultToolInputs(tool));
  const state = reactive<ToolState>({
    input: inputs.value[primaryInputKey] ?? "",
    output: "",
    extraInputs: {},
    options: buildDefaultToolOptions(tool),
    isLoading: false,
    error: null,
    details: null,
  });

  let debounceTimer: number | null = null;
  let latestRunId = 0;
  let hydrated = false;
  let hadStoredState = false;

  const totalInputBytes = computed(() =>
    Object.values(inputs.value).reduce(
      (sum, current) => sum + textEncoder.encode(current).byteLength,
      0,
    ),
  );

  const hasOutput = computed(() => Boolean(state.output || state.details));

  const syncInputSnapshot = () => {
    state.input = inputs.value[primaryInputKey] ?? "";
    state.extraInputs = Object.fromEntries(
      Object.entries(inputs.value).filter(([key]) => key !== primaryInputKey),
    );
  };

  const persistState = () => {
    if (!import.meta.client || !hydrated) {
      return;
    }

    localStorage.setItem(
      getPersistKey(tool),
      JSON.stringify({
        inputs: inputs.value,
        options: state.options,
      }),
    );
  };

  const hydrateFromStorage = () => {
    if (!import.meta.client) {
      return;
    }

    const rawValue = localStorage.getItem(getPersistKey(tool));
    console.log("[useTool] hydrateFromStorage", {
      toolId: tool.id,
      hasStored: !!rawValue,
    });
    if (!rawValue) {
      hydrated = true;
      return;
    }

    try {
      hadStoredState = true;
      const parsed = JSON.parse(rawValue) as {
        inputs?: ToolInputValues;
        options?: ToolOptionValues;
      };

      inputs.value = {
        ...buildDefaultToolInputs(tool),
        ...(parsed.inputs ?? {}),
      };

      state.options = mergeToolOptions(
        buildDefaultToolOptions(tool),
        parsed.options,
      );
    } catch {
      localStorage.removeItem(getPersistKey(tool));
    } finally {
      hydrated = true;
      syncInputSnapshot();
    }
  };

  const validateInputSize = () => {
    const limit = tool.inputLimitBytes ?? 1024 * 1024;
    if (totalInputBytes.value > limit) {
      throw new Error(
        `输入内容过大，请控制在 ${(limit / 1024 / 1024).toFixed(0)}MB 以内。`,
      );
    }
  };

  const buildPayload = (): ToolProcessPayload => ({
    toolId: tool.id,
    inputs: cloneInputs(inputs.value),
    options: cloneOptions(state.options),
  });

  const processNow = async () => {
    latestRunId += 1;
    const currentRunId = latestRunId;

    syncInputSnapshot();
    console.log("[useTool] processNow start", {
      toolId: tool.id,
      runId: currentRunId,
      inputs: JSON.stringify(inputs.value),
      options: JSON.stringify(state.options),
    });

    state.error = null;
    state.isLoading = true;

    try {
      // 仅在工具声明了输入字段且全为空时才跳过（避免纯 options 驱动的工具被误跳过）
      const isAllInputsEmpty =
        tool.inputs.length > 0 &&
        Object.values(inputs.value).every((value) => !value.trim());
      if (isAllInputsEmpty) {
        console.log("[useTool] processNow skipped — all inputs empty");
        state.output = "";
        state.details = null;
        state.isLoading = false;
        return;
      }

      validateInputSize();
      const payload = buildPayload();
      const result = await executeWithWorker(payload).catch(() =>
        executeInIdleTime(payload),
      );

      if (currentRunId !== latestRunId) {
        console.log("[useTool] processNow result discarded (stale run)", {
          currentRunId,
          latestRunId,
        });
        return;
      }

      state.output = result.output;
      state.details = result.details;
      console.log("[useTool] processNow success", {
        output: result.output.substring(0, 100),
        details: JSON.stringify(result.details).substring(0, 200),
      });
      options.onProcess?.(result);
    } catch (error) {
      if (currentRunId !== latestRunId) {
        return;
      }

      state.output = "";
      state.details = null;
      state.error =
        error instanceof Error ? error.message : "处理失败，请检查输入内容。";
      console.error("[useTool] processNow error", state.error, error);
    } finally {
      if (currentRunId === latestRunId) {
        state.isLoading = false;
      }
    }
  };

  const scheduleProcess = () => {
    if (!hydrated) {
      console.log("[useTool] scheduleProcess skipped — not hydrated");
      return;
    }

    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
    }

    console.log("[useTool] scheduleProcess → debouncing", {
      toolId: tool.id,
      debounceMs,
    });
    debounceTimer = window.setTimeout(() => {
      console.log("[useTool] scheduleProcess → executing processNow");
      void processNow();
    }, debounceMs);
  };

  const updateInput = (key: string, value: string) => {
    inputs.value = {
      ...inputs.value,
      [key]: value,
    };
    syncInputSnapshot();
  };

  const updateOption = (key: string, value: ToolOptionValues[string]) => {
    console.log("[useTool] updateOption called", {
      key,
      value,
      currentOptions: JSON.stringify(state.options),
    });
    state.options = mergeToolOptions(state.options, { [key]: value });
    console.log("[useTool] updateOption after merge", {
      newOptions: JSON.stringify(state.options),
    });
  };

  const loadExample = () => {
    inputs.value = {
      ...buildDefaultToolInputs(tool),
      ...tool.example.inputs,
    };
    state.options = mergeToolOptions(
      buildDefaultToolOptions(tool),
      tool.example.options,
    );
    syncInputSnapshot();
    persistState();
    void processNow();
  };

  const clear = () => {
    inputs.value = Object.fromEntries(
      tool.inputs.map((item) => [item.key, ""]),
    );
    state.options = buildDefaultToolOptions(tool);
    state.output = "";
    state.details = null;
    state.error = null;
    syncInputSnapshot();
    persistState();
  };

  const swap = () => {
    if (!tool.features.hasSwap) {
      return;
    }

    const currentOutput = state.output;
    inputs.value = {
      ...inputs.value,
      [primaryInputKey]: currentOutput,
    };
    if (state.options.mode === "encode") {
      state.options = { ...state.options, mode: "decode" };
    } else if (state.options.mode === "decode") {
      state.options = { ...state.options, mode: "encode" };
    } else if (state.options.mode === "hex-to-rgb") {
      state.options = { ...state.options, mode: "rgb-to-hex" };
    } else if (state.options.mode === "rgb-to-hex") {
      state.options = { ...state.options, mode: "hex-to-rgb" };
    }
    syncInputSnapshot();
    persistState();
    void processNow();
  };

  const copyToClipboard = async (value = state.output) => {
    if (!import.meta.client || !value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      ElMessage.success("已复制到剪贴板");
    } catch {
      ElMessage.warning("复制失败，请手动复制结果");
    }
  };

  const exportResult = () => {
    if (!import.meta.client || !hasOutput.value) {
      return;
    }

    const content =
      state.details?.kind === "metrics"
        ? JSON.stringify(state.details.items, null, 2)
        : state.details?.kind === "regex"
          ? JSON.stringify(
              {
                pattern: state.details.pattern,
                flags: state.details.flags,
                matches: state.details.matches,
              },
              null,
              2,
            )
          : state.details?.kind === "timestamp"
            ? JSON.stringify(state.details.entries, null, 2)
            : state.details?.kind === "color"
              ? JSON.stringify(state.details.variants, null, 2)
              : state.details?.kind === "case"
                ? JSON.stringify(state.details.variants, null, 2)
                : state.output;

    const blob = new Blob([content], {
      type: tool.outputMimeType ?? "text/plain;charset=utf-8",
    });
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${tool.id}-${Date.now()}.${tool.outputFileExtension ?? "txt"}`;
    downloadLink.click();
    URL.revokeObjectURL(downloadLink.href);
  };

  const saveToCloud = async () => {
    return Promise.reject(new Error("暂未启用云端保存功能。"));
  };

  watch(
    inputs,
    () => {
      syncInputSnapshot();
      if (import.meta.client && hydrated) {
        persistState();
        scheduleProcess();
      }
    },
    { deep: true },
  );

  watch(
    () => state.options,
    () => {
      if (import.meta.client && hydrated) {
        persistState();
        scheduleProcess();
      }
    },
    { deep: true },
  );

  onMounted(() => {
    console.log("[useTool] onMounted", {
      toolId: tool.id,
      hasStored: hadStoredState,
    });
    ensureWorker();
    hydrateFromStorage();
    if (
      !hadStoredState &&
      !state.input &&
      Object.values(state.extraInputs).every((value) => !value)
    ) {
      console.log("[useTool] onMounted → loading example");
      loadExample();
      return;
    }

    console.log("[useTool] onMounted → calling processNow");
    void processNow();
  });

  onBeforeUnmount(() => {
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
    }
  });

  const toolPath = computed(() => getToolPath(tool));

  return {
    toolPath,
    inputs,
    state,
    hasOutput,
    totalInputBytes,
    updateInput,
    updateOption,
    processNow,
    loadExample,
    clear,
    swap,
    copyToClipboard,
    exportResult,
    saveToCloud,
  };
};
