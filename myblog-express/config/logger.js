/**
 * Winston 结构化日志配置
 *
 * 输出：
 *   - console（开发环境彩色、生产环境 JSON）
 *   - logs/combined.log（全部日志）
 *   - logs/error.log（仅错误级别）
 */

const { createLogger, format, transports } = require("winston");
const path = require("path");

const isProduction = process.env.NODE_ENV === "production";

const consoleFormat = isProduction
  ? format.combine(format.timestamp(), format.json())
  : format.combine(
      format.colorize(),
      format.timestamp({ format: "HH:mm:ss" }),
      format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length
          ? ` ${JSON.stringify(meta)}`
          : "";
        return `${timestamp} ${level}: ${message}${metaStr}`;
      }),
    );

const logger = createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  format: format.combine(format.errors({ stack: true }), format.timestamp()),
  transports: [
    new transports.Console({ format: consoleFormat }),
    new transports.File({
      filename: path.join(__dirname, "..", "logs", "error.log"),
      level: "error",
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    new transports.File({
      filename: path.join(__dirname, "..", "logs", "combined.log"),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    }),
  ],
});

module.exports = logger;
