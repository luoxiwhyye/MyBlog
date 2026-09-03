// ============================================
// utils/tools/diff.ts - JSON Diff（纯前端）
// 将两个 JSON 序列化后做行级 LCS 差异比较，
// 输出 add / remove / context 行。
// ============================================
import type { DiffLine } from "../../types/tool";

/** 基于 LCS 的行级 diff */
const diffLines = (oldLines: string[], newLines: string[]): DiffLine[] => {
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      result.push({ type: "context", text: oldLines[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "remove", text: oldLines[i] });
      i += 1;
    } else {
      result.push({ type: "add", text: newLines[j] });
      j += 1;
    }
  }

  while (i < m) {
    result.push({ type: "remove", text: oldLines[i] });
    i += 1;
  }
  while (j < n) {
    result.push({ type: "add", text: newLines[j] });
    j += 1;
  }

  return result;
};

const jsonToLines = (value: unknown): string[] => {
  return JSON.stringify(value, null, 2).split("\n");
};

export const diffJson = (left: string, right: string): DiffLine[] => {
  if (!left.trim() || !right.trim()) {
    throw new Error("左右两侧 JSON 都不能为空。");
  }

  let leftJson: unknown;
  let rightJson: unknown;
  try {
    leftJson = JSON.parse(left);
  } catch {
    throw new Error("左侧不是合法的 JSON。");
  }
  try {
    rightJson = JSON.parse(right);
  } catch {
    throw new Error("右侧不是合法的 JSON。");
  }

  return diffLines(jsonToLines(leftJson), jsonToLines(rightJson));
};

/** 将 diff 行渲染为文本 */
export const diffToText = (lines: DiffLine[]): string => {
  return lines
    .map((line) => {
      if (line.type === "add") return `+ ${line.text}`;
      if (line.type === "remove") return `- ${line.text}`;
      return `  ${line.text}`;
    })
    .join("\n");
};
