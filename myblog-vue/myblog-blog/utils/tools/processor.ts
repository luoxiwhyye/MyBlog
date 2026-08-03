import type {
  ToolId,
  ToolProcessPayload,
  ToolProcessResult,
  ToolResultDetails,
} from "../../types/tool";
import {
  decodeBase64,
  decodeHtmlEntity,
  decodeUnicode,
  decodeUrl,
  encodeBase64,
  encodeHtmlEntity,
  encodeUnicode,
  encodeUrl,
} from "./encoding";
import { convertTimestamp, createMd5, createShaHash } from "./crypto";
import { convertColorValue, describePickedColor } from "./color";
import { formatJson, formatSql, formatXml, minifyJson } from "./formatter";
import { convertCase, countTextMetrics, testRegex } from "./text";

const getInput = (payload: ToolProcessPayload, key: string) => {
  return payload.inputs[key] ?? "";
};

const getOption = <TValue extends string | number | boolean | string[]>(
  payload: ToolProcessPayload,
  key: string,
  fallback: TValue,
) => {
  return (payload.options[key] as TValue | undefined) ?? fallback;
};

const buildResult = (
  output: string,
  details: ToolResultDetails | null = null,
): ToolProcessResult => ({
  output,
  details,
});

const runEncodingTool = (toolId: ToolId, input: string, mode: string) => {
  switch (toolId) {
    case "base64":
      return mode === "decode" ? decodeBase64(input) : encodeBase64(input);
    case "url":
      return mode === "decode" ? decodeUrl(input) : encodeUrl(input);
    case "unicode":
      return mode === "decode" ? decodeUnicode(input) : encodeUnicode(input);
    case "html-entity":
      return mode === "decode"
        ? decodeHtmlEntity(input)
        : encodeHtmlEntity(input);
    default:
      return input;
  }
};

export const processTool = async (
  payload: ToolProcessPayload,
): Promise<ToolProcessResult> => {
  switch (payload.toolId) {
    case "base64":
    case "url":
    case "unicode":
    case "html-entity": {
      const output = runEncodingTool(
        payload.toolId,
        getInput(payload, "content"),
        getOption(payload, "mode", "encode"),
      );
      return buildResult(output);
    }
    case "json": {
      return buildResult(
        formatJson(
          getInput(payload, "content"),
          Number(getOption(payload, "indent", 2)),
        ),
      );
    }
    case "json-minify": {
      return buildResult(minifyJson(getInput(payload, "content")));
    }
    case "sql": {
      return buildResult(
        formatSql(
          getInput(payload, "content"),
          getOption(payload, "keywordCase", "upper") === "upper",
        ),
      );
    }
    case "xml": {
      return buildResult(
        formatXml(
          getInput(payload, "content"),
          Number(getOption(payload, "indent", 2)),
        ),
      );
    }
    case "md5": {
      return buildResult(createMd5(getInput(payload, "content")));
    }
    case "sha": {
      return buildResult(
        await createShaHash(
          getInput(payload, "content"),
          getOption(payload, "algorithm", "SHA-256") as
            | "SHA-1"
            | "SHA-256"
            | "SHA-512",
        ),
      );
    }
    case "timestamp": {
      const result = convertTimestamp(getInput(payload, "content"));
      return buildResult(
        `本地时间：${result.local}\nUTC 时间：${result.utc}\nISO：${result.iso}\n秒级时间戳：${result.seconds}\n毫秒时间戳：${result.milliseconds}`,
        {
          kind: "timestamp",
          entries: [
            { label: "本地时间", value: result.local },
            { label: "UTC", value: result.utc },
            { label: "ISO 8601", value: result.iso },
            { label: "秒级时间戳", value: result.seconds },
            { label: "毫秒时间戳", value: result.milliseconds },
          ],
        },
      );
    }
    case "regex": {
      const pattern = getInput(payload, "pattern");
      const sourceText = getInput(payload, "content");
      const flags = getOption(payload, "flags", ["g"]).join("");
      const result = testRegex(pattern, flags, sourceText);
      return buildResult(result.summary, {
        kind: "regex",
        sourceText,
        pattern,
        flags: result.flags,
        matches: result.matches,
      });
    }
    case "word-count": {
      const metrics = countTextMetrics(getInput(payload, "content"));
      return buildResult(
        metrics.map((item) => `${item.label}：${item.value}`).join("\n"),
        {
          kind: "metrics",
          title: "文本统计",
          items: metrics,
        },
      );
    }
    case "case-convert": {
      const target = getOption(payload, "target", "camel");
      const result = convertCase(getInput(payload, "content"), target);
      return buildResult(result.output, {
        kind: "case",
        selectedKey: target,
        variants: result.variants,
      });
    }
    case "color-convert": {
      const result = convertColorValue(
        getInput(payload, "content"),
        getOption(payload, "mode", "auto"),
      );
      return buildResult(result.output, {
        kind: "color",
        swatch: result.swatch,
        variants: result.variants,
      });
    }
    case "color-picker": {
      const result = describePickedColor(
        getInput(payload, "color"),
        getOption(payload, "format", "hex"),
      );
      return buildResult(result.output, {
        kind: "color",
        swatch: result.swatch,
        variants: result.variants,
      });
    }
    default:
      return buildResult("");
  }
};
