// ============================================
// utils/tools/password.ts - 密码生成器（纯前端）
// 使用 crypto.getRandomValues 生成强随机密码。
// ============================================

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const NUMBER = "0123456789";
const SYMBOL = "!@#$%^&*()-_=+[]{}|;:,.<>?/";

export interface PasswordOptions {
  length: number;
  upper: boolean;
  lower: boolean;
  number: boolean;
  symbol: boolean;
}

/** 生成随机密码 */
export const generatePassword = (options: PasswordOptions): string => {
  const { length, upper, lower, number, symbol } = options;

  let pool = "";
  if (upper) pool += UPPER;
  if (lower) pool += LOWER;
  if (number) pool += NUMBER;
  if (symbol) pool += SYMBOL;

  if (!pool) {
    throw new Error("请至少选择一种字符类型。");
  }

  const chars = pool.split("");
  const result: string[] = [];

  // 每个启用字符集至少贡献一个字符，保证覆盖
  const required = [
    upper ? UPPER : "",
    lower ? LOWER : "",
    number ? NUMBER : "",
    symbol ? SYMBOL : "",
  ].filter(Boolean);

  const picked: string[] = required.map((charset) => {
    const idx = crypto.getRandomValues(new Uint32Array(1))[0] % charset.length;
    return charset[idx];
  });

  const poolArr = chars;
  for (let i = picked.length; i < length; i += 1) {
    const idx = crypto.getRandomValues(new Uint32Array(1))[0] % poolArr.length;
    picked.push(poolArr[idx]);
  }

  // Fisher-Yates 洗牌
  for (let i = picked.length - 1; i > 0; i -= 1) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }

  return picked.slice(0, length).join("");
};
