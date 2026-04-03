import dayjs from "dayjs";

export const formatDate = (date: string, format = "YYYY-MM-DD") => {
  return dayjs(date).format(format);
};

export const formatDateTime = (date: string) => {
  return dayjs(date).format("YYYY-MM-DD HH:mm:ss");
};
