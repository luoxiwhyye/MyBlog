// ============================================
// utils/tools/jwt.ts - JWT 解析与签名校验（纯前端）
// 解析 header/payload（base64url 解码），
// 使用 Web Crypto (crypto.subtle) 校验 HMAC 签名。
// ============================================
import type { JwtHeader, JwtPayload } from "../../types/tool";

/** base64url → base64 → 字符串 */
const base64UrlDecode = (input: string): string => {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = padded.length % 4;
  const withPadding =
    padLen === 0 ? padded : padded.padEnd(padded.length + (4 - padLen), "=");
  const binary = atob(withPadding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(bytes);
};

const base64UrlEncode = (input: string): string => {
  // input 为 Binary String（每个字符 0-255），直接 btoa 编码，避免 TextEncoder 按 UTF-8 重编码高字节
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const safeJsonParse = <T>(raw: string, label: string): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`${label} 不是合法的 JSON。`);
  }
};

export interface JwtParseResult {
  header: JwtHeader;
  payload: JwtPayload;
  encoded: { header: string; payload: string; signature: string };
  signatureValid: boolean;
  signatureMessage: string;
}

/** 解析 JWT，并可选校验 HMAC 签名 */
export const parseJwt = async (
  token: string,
  secret?: string,
): Promise<JwtParseResult> => {
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    throw new Error("JWT 格式不正确，应为三段 base64url 字符串。");
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = safeJsonParse<JwtHeader>(
    base64UrlDecode(headerB64 || ""),
    "Header",
  );
  const payload = safeJsonParse<JwtPayload>(
    base64UrlDecode(payloadB64 || ""),
    "Payload",
  );

  let signatureValid = false;
  let signatureMessage = "未校验签名（未提供密钥）";

  if (secret) {
    try {
      const alg = header.alg || "HS256";
      if (!/^HS(256|384|512)$/.test(alg)) {
        throw new Error(`暂不支持算法 ${alg}（仅支持 HS256/384/512）。`);
      }
      const hashName = alg.replace("HS", "SHA-");
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: hashName },
        false,
        ["sign"],
      );
      const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
      const signature = await crypto.subtle.sign("HMAC", key, data);
      const expected = base64UrlEncode(
        String.fromCharCode(...new Uint8Array(signature)),
      );
      signatureValid = expected === signatureB64;
      signatureMessage = signatureValid
        ? "签名有效"
        : "签名无效（密钥不匹配或数据被篡改）";
    } catch (err) {
      signatureMessage = err instanceof Error ? err.message : "签名校验失败";
    }
  }

  return {
    header,
    payload,
    encoded: {
      header: headerB64,
      payload: payloadB64,
      signature: signatureB64,
    },
    signatureValid,
    signatureMessage,
  };
};
