// ============================================
// utils/tools/cron.ts - Cron 表达式解析（纯前端）
// 使用 cron-parser 计算下一次若干次执行时间。
// ============================================
import { CronExpressionParser } from "cron-parser";

export interface CronResult {
  expression: string;
  nextRunTimes: string[];
  humanized: string;
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const pad = (n: number) => String(n).padStart(2, "0");

/** 格式化执行时间为可读字符串 */
const formatRunTime = (date: Date): string => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )} 周${WEEKDAYS[date.getDay()]}`;
};

const describeCron = (fields: string[]): string => {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
  const parts: string[] = [];
  if (minute === "*" && hour === "*") {
    parts.push("每分钟");
  } else {
    const hourText = hour === "*" ? "每小时" : `${hour} 点`;
    const minuteText = minute === "*" ? "每分钟" : `${minute} 分`;
    if (hour === "*" || hour === "*/1") {
      parts.push(`每小时的第 ${minute} 分`);
    } else if (minute === "*") {
      parts.push(`${hour} 点的每分钟`);
    } else if (minute === "0") {
      parts.push(`每天 ${hour} 点整`);
    } else {
      parts.push(`每天 ${hour}:${pad(Number(minute))}`);
    }
  }

  if (dayOfMonth !== "*") {
    parts.push(`每月 ${dayOfMonth} 日`);
  }
  if (dayOfWeek !== "*") {
    const wd = Number(dayOfWeek);
    if (!Number.isNaN(wd)) {
      parts.push(`的${WEEKDAYS[wd]}`);
    }
  }
  if (month !== "*") {
    const m = Number(month);
    if (!Number.isNaN(m)) {
      parts.push(`的${m}月`);
    }
  }

  return parts.join("").replace(/的的/g, "的") || `每 ${fields.join(" ")}`;
};

/**
 * 解析 Cron 表达式（5 段），输出下次若干次执行时间。
 */
export const parseCron = (expression: string, count = 5): CronResult => {
  const expr = expression.trim();
  if (!expr) {
    throw new Error("请输入 Cron 表达式。");
  }
  if (expr.split(/\s+/).length !== 5) {
    throw new Error("Cron 表达式应为 5 段（分 时 日 月 周）。");
  }

  const interval = CronExpressionParser.parse(expr);
  const nextRunTimes: string[] = [];
  const safeCount = Math.min(Math.max(count || 1, 1), 20);
  for (let i = 0; i < safeCount; i += 1) {
    const next = interval.next();
    nextRunTimes.push(formatRunTime(next.toDate()));
  }

  const fields = expr.split(/\s+/);
  return {
    expression: expr,
    nextRunTimes,
    humanized: describeCron(fields),
  };
};
