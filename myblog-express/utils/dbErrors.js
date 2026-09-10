/**
 * 数据库错误识别工具
 *
 * 唯一索引冲突（MySQL 错误码 1062 / `ER_DUP_ENTRY`）在「先查重再写入」的写法下
 * 仍可能因并发命中，需要转成友好的 409 提示，而不是落到 500。
 */

const MYSQL_DUP_ENTRY = 1062;

/**
 * 是否「唯一索引冲突」
 * @param {any} err
 * @returns {boolean}
 */
const isDuplicateEntryError = (err) =>
  Boolean(err) &&
  (err.code === "ER_DUP_ENTRY" || err.errno === MYSQL_DUP_ENTRY);

module.exports = {
  MYSQL_DUP_ENTRY,
  isDuplicateEntryError,
};
