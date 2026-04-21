import dayjs from "dayjs";

export const formatDate = (date: string, format = "YYYY-MM-DD") => {
  return dayjs(date).format(format);
};

export const formatDateTime = (date: string) => {
  return dayjs(date).format("YYYY-MM-DD HH:mm:ss");
};

export const estimateReadTime = (content = "") => {
  const plainText = content.replace(/<[^>]+>/g, "").trim();
  if (!plainText) {
    return "1 分钟";
  }

  const words = plainText.length;
  const minutes = Math.max(1, Math.ceil(words / 400));
  return `${minutes} 分钟`;
};
