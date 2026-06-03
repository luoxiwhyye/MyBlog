const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const htmlEntityMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const reverseHtmlEntityMap = Object.fromEntries(
  Object.entries(htmlEntityMap).map(([character, entity]) => [entity, character]),
);

const toUtf8Binary = (input: string) => {
  return Array.from(textEncoder.encode(input), (byte) => String.fromCharCode(byte)).join("");
};

const fromUtf8Binary = (binary: string) => {
  return textDecoder.decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
};

export const encodeBase64 = (input: string) => {
  return btoa(toUtf8Binary(input));
};

export const decodeBase64 = (input: string) => {
  const normalized = input.replace(/\s+/g, "");
  if (!normalized) {
    return "";
  }

  return fromUtf8Binary(atob(normalized));
};

export const encodeUrl = (input: string) => {
  return encodeURIComponent(input);
};

export const decodeUrl = (input: string) => {
  return decodeURIComponent(input);
};

const encodeCodePoint = (codePoint: number) => {
  if (codePoint <= 0xffff) {
    return `\\u${codePoint.toString(16).padStart(4, "0")}`;
  }

  const adjusted = codePoint - 0x10000;
  const highSurrogate = 0xd800 + (adjusted >> 10);
  const lowSurrogate = 0xdc00 + (adjusted & 0x3ff);

  return `\\u${highSurrogate.toString(16).padStart(4, "0")}\\u${lowSurrogate
    .toString(16)
    .padStart(4, "0")}`;
};

export const encodeUnicode = (input: string) => {
  return Array.from(input)
    .map((character) => encodeCodePoint(character.codePointAt(0) ?? 0))
    .join("");
};

export const decodeUnicode = (input: string) => {
  return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, hexValue: string) =>
    String.fromCharCode(Number.parseInt(hexValue, 16)),
  );
};

export const encodeHtmlEntity = (input: string) => {
  return input.replace(/[&<>"']/g, (character) => htmlEntityMap[character] ?? character);
};

export const decodeHtmlEntity = (input: string) => {
  return input
    .replace(/&(amp|lt|gt|quot|#39);/g, (entity) => reverseHtmlEntityMap[entity] ?? entity)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hexValue: string) =>
      String.fromCodePoint(Number.parseInt(hexValue, 16)),
    )
    .replace(/&#([0-9]+);/g, (_, decimalValue: string) =>
      String.fromCodePoint(Number.parseInt(decimalValue, 10)),
    );
};
