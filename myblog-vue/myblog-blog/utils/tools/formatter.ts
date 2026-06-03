const sqlClauseMatchers = [
  "select",
  "from",
  "where",
  "group by",
  "order by",
  "having",
  "limit",
  "offset",
  "insert into",
  "values",
  "update",
  "set",
  "delete",
  "inner join",
  "left join",
  "right join",
  "full join",
  "cross join",
  "on",
  "union all",
  "and",
  "or",
].map((keyword) => ({
  raw: keyword,
  pattern: new RegExp(`\\b${keyword.replace(/\s+/g, "\\s+")}\\b`, "gi"),
}));

const plainJoinMatcher = {
  raw: "join",
  pattern: /\b(?<!inner\s)(?<!left\s)(?<!right\s)(?<!full\s)(?<!cross\s)join\b/gi,
};

const plainUnionMatcher = {
  raw: "union",
  pattern: /\bunion\b(?!\s+all)/gi,
};

export const formatJson = (input: string, indent = 2) => {
  return JSON.stringify(JSON.parse(input), null, indent);
};

export const minifyJson = (input: string) => {
  return JSON.stringify(JSON.parse(input));
};

export const formatSql = (input: string, uppercase = true) => {
  let normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  normalized = normalized.replace(/,\s*/g, ",\n  ");

  for (const matcher of sqlClauseMatchers) {
    const replacement = uppercase ? matcher.raw.toUpperCase() : matcher.raw.toLowerCase();
    normalized = normalized.replace(matcher.pattern, `\n${replacement}`);
  }

  normalized = normalized.replace(
    plainJoinMatcher.pattern,
    `\n${uppercase ? plainJoinMatcher.raw.toUpperCase() : plainJoinMatcher.raw.toLowerCase()}`,
  );
  normalized = normalized.replace(
    plainUnionMatcher.pattern,
    `\n${uppercase ? plainUnionMatcher.raw.toUpperCase() : plainUnionMatcher.raw.toLowerCase()}`,
  );

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      if (/^(AND|OR)\b/i.test(line)) {
        return `  ${line}`;
      }

      if (/^[,)]/.test(line)) {
        return `  ${line}`;
      }

      return line;
    })
    .join("\n")
    .replace(/^\n+/, "");
};

export const formatXml = (input: string, indentSize = 2) => {
  const sanitized = input.replace(/>\s+</g, "><").trim();
  if (!sanitized) {
    return "";
  }

  const indentation = " ".repeat(Math.max(0, indentSize));
  const tokens = sanitized.replace(/(>)(<)(\/*)/g, "$1\n$2$3").split("\n");
  let depth = 0;

  return tokens
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const isClosingTag = /^<\/.+>/.test(token);
      const isCommentOrDeclaration = /^<\?/.test(token) || /^<!--/.test(token);
      const isSelfClosing = /\/>$/.test(token);
      const isInlinePair = /^<[^!?/][^>]*>[^<]*<\/[^>]+>$/.test(token);

      if (isClosingTag) {
        depth = Math.max(depth - 1, 0);
      }

      const line = `${indentation.repeat(depth)}${token}`;

      if (!isClosingTag && !isSelfClosing && !isInlinePair && !isCommentOrDeclaration) {
        depth += 1;
      }

      return line;
    })
    .join("\n");
};
