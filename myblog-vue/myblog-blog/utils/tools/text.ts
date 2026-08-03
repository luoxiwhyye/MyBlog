import type { RegexMatchItem } from "../../types/tool";

const textEncoder = new TextEncoder();

const caseLabels: Record<string, string> = {
  camel: "camelCase",
  pascal: "PascalCase",
  snake: "snake_case",
  kebab: "kebab-case",
  constant: "CONSTANT_CASE",
  title: "Title Case",
  upper: "UPPER CASE",
  lower: "lower case",
};

export const getCaseLabel = (key: string) => {
  return caseLabels[key] ?? key;
};

const tokenizeWords = (input: string) => {
  return input
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

const capitalize = (value: string) => {
  return value
    ? `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`
    : "";
};

export const testRegex = (
  pattern: string,
  flags: string,
  sourceText: string,
) => {
  const normalizedFlags = Array.from(
    new Set(flags.split("").filter(Boolean)),
  ).join("");
  const runtimeFlags = normalizedFlags.includes("g")
    ? normalizedFlags
    : `${normalizedFlags}g`;
  const regex = new RegExp(pattern, runtimeFlags);
  const matches: RegexMatchItem[] = [];
  let currentMatch: RegExpExecArray | null = regex.exec(sourceText);

  while (currentMatch) {
    matches.push({
      index: currentMatch.index,
      text: currentMatch[0] ?? "",
      groups: currentMatch.slice(1).map((item) => item ?? ""),
    });

    if ((currentMatch[0] ?? "") === "") {
      regex.lastIndex += 1;
    }

    currentMatch = regex.exec(sourceText);
  }

  return {
    flags: normalizedFlags,
    matches,
    summary: `共匹配 ${matches.length} 处${matches.length ? "，已在下方高亮展示" : ""}。`,
  };
};

export const countTextMetrics = (input: string) => {
  const lines = input ? input.split(/\r?\n/) : [];
  const words = input.match(/[A-Za-z0-9_]+|[\u3400-\u9fff]/g)?.length ?? 0;
  const paragraphs = input
    .split(/\n\s*\n/)
    .map((segment) => segment.trim())
    .filter(Boolean).length;

  return [
    { label: "字符数", value: input.length },
    { label: "去空格字符", value: input.replace(/\s/g, "").length },
    { label: "单词数", value: words },
    { label: "行数", value: lines.length || 0 },
    { label: "段落数", value: paragraphs || 0 },
    { label: "字节数", value: textEncoder.encode(input).byteLength },
  ];
};

export const convertCase = (input: string, target: string) => {
  const tokens = tokenizeWords(input);
  const lowerTokens = tokens.map((token) => token.toLowerCase());
  const variants = {
    camel: lowerTokens
      .map((token, index) => (index === 0 ? token : capitalize(token)))
      .join(""),
    pascal: lowerTokens.map(capitalize).join(""),
    snake: lowerTokens.join("_"),
    kebab: lowerTokens.join("-"),
    constant: lowerTokens.join("_").toUpperCase(),
    title: lowerTokens.map(capitalize).join(" "),
    upper: input.toUpperCase(),
    lower: input.toLowerCase(),
  };

  return {
    output: variants[target as keyof typeof variants] ?? input,
    variants: Object.entries(variants).map(([key, value]) => ({
      key,
      label: getCaseLabel(key),
      value,
    })),
  };
};
