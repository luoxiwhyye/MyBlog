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
import { parseJwt } from "./jwt";
import { generateQrSvg } from "./qr";
import { generatePassword } from "./password";
import { parseCron } from "./cron";
import { diffJson, diffToText } from "./diff";

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
      const mode = String(getOption(payload, "mode", "format"));
      const content = getInput(payload, "content");
      if (mode === "minify") {
        return buildResult(minifyJson(content));
      }
      return buildResult(
        formatJson(content, Number(getOption(payload, "indent", 2))),
      );
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
    case "color": {
      const mode = String(getOption(payload, "mode", "convert"));
      const format = String(getOption(payload, "format", "hex"));
      // 「输入颜色值」或用「可视化取色」
      const input =
        mode === "picker"
          ? getInput(payload, "color")
          : getInput(payload, "content");
      const result =
        mode === "picker"
          ? describePickedColor(input, format)
          : convertColorValue(input, "auto");
      return buildResult(result.output, {
        kind: "color",
        swatch: result.swatch,
        variants: result.variants,
      });
    }
    case "jwt-parse": {
      const result = await parseJwt(
        getInput(payload, "token"),
        getInput(payload, "secret") || undefined,
      );
      const output = [
        `Header: ${JSON.stringify(result.header)}`,
        `Payload: ${JSON.stringify(result.payload)}`,
        `签名校验: ${result.signatureMessage}`,
      ].join("\n");
      return buildResult(output, {
        kind: "jwt",
        header: result.header,
        payload: result.payload,
        signatureValid: result.signatureValid,
        signatureMessage: result.signatureMessage,
        encoded: result.encoded,
      });
    }
    case "qr": {
      const content = getInput(payload, "content");
      const size = Number(getOption(payload, "size", 256)) || 256;
      const svg = await generateQrSvg(content, size);
      // 转成 data URL 图片便于 <img> 预览 + 焦点下载
      const dataUrl = `data:image/svg+xml;base64,${btoa(
        unescape(encodeURIComponent(svg)),
      )}`;
      return buildResult(content, {
        kind: "image",
        src: dataUrl,
        alt: `二维码: ${content.slice(0, 40)}`,
        width: size,
        height: size,
      });
    }
    case "password": {
      const result = generatePassword({
        length: Number(getOption(payload, "length", 16)),
        upper: Boolean(getOption(payload, "upper", true)),
        lower: Boolean(getOption(payload, "lower", true)),
        number: Boolean(getOption(payload, "number", true)),
        symbol: Boolean(getOption(payload, "symbol", true)),
      });
      return buildResult(result, {
        kind: "metrics",
        title: "生成结果",
        items: [
          { label: "密码", value: result },
          { label: "长度", value: String(result.length) },
          { label: "强度", value: estimateStrength(result) },
        ],
      });
    }
    case "cron": {
      const result = parseCron(
        getInput(payload, "expression"),
        Number(getOption(payload, "count", 5)) || 5,
      );
      const output = [
        `表达式: ${result.expression}`,
        `解释: ${result.humanized}`,
        "",
        ...result.nextRunTimes.map(
          (time, index) => `第 ${index + 1} 次: ${time}`,
        ),
      ].join("\n");
      return buildResult(output, {
        kind: "metrics",
        title: `下次 ${result.nextRunTimes.length} 次执行`,
        items: result.nextRunTimes.map((time, index) => ({
          label: `第 ${index + 1} 次`,
          value: time,
        })),
      });
    }
    case "json-diff": {
      const lines = diffJson(
        getInput(payload, "left"),
        getInput(payload, "right"),
      );
      return buildResult(diffToText(lines), {
        kind: "diff",
        lines,
      });
    }
    default:
      return buildResult("");
  }
};

/** 依据长度与字符多样性估算密码强度（0-4 分） */
const estimateStrength = (password: string): string => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  const labels = ["弱", "较弱", "中等", "强", "很强"];
  return labels[Math.min(score, labels.length - 1)];
};
