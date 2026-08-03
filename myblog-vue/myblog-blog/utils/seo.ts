export const stripHtml = (value = "") => {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

export const truncateText = (value = "", maxLength = 160) => {
  const text = stripHtml(value);
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}…`;
};

export const normalizeUrl = (value = "", base?: string) => {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
};

export const buildCanonicalUrl = (siteUrl: string, fullPath = "/") => {
  return new URL(fullPath || "/", siteUrl).toString();
};
