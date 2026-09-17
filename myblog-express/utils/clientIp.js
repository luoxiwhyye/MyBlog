// ============================================
// utils/clientIp.js - 取客户端 IP 的唯一实现
//
// 「客户端 IP」在本项目里有三个消费点：限流分桶、评论入库、留言入库。
// 它们必须共用同一个函数，否则同一份部署下会出现「限流按代理 IP、入库按真实 IP」
// 这类自相矛盾的口径。
//
// 语义由 app.set("trust proxy", TRUST_PROXY) 决定（见 app.js）：
//   TRUST_PROXY=0  → 不信任任何转发头，取 socket 地址（直连部署）
//   TRUST_PROXY=n  → 信任右起 n 跳代理，取 X-Forwarded-For 里对应那一项
//       （经 nginx / Nuxt 一层反代时 n=1，得到真实访客 IP；伪造的 XFF 前缀会被忽略）
//
// ⚠️ 因此这里**只读 req.ip**，不要自己解析 X-Forwarded-For / X-Real-IP ——
// 手写解析会绕开 TRUST_PROXY，让「关闭信任」这个开关形同虚设。
// ⚠️ Spring 侧对应 config/ClientIpResolver.java，两者语义必须逐项对齐。
// ============================================

/**
 * 归一化 IP 字面量：去掉 IPv4-mapped IPv6 前缀。
 *
 * Node 的 socket 地址对 IPv4 访客返回 `::ffff:127.0.0.1`，而转发头里写的是
 * `127.0.0.1`；不归一化会让「直连」与「经反代」两种情形入库两种写法，
 * 也会让双端（Java 返回 `127.0.0.1`）对不上。
 */
const normalizeIp = (value) =>
  String(value || "")
    .trim()
    .replace(/^::ffff:/i, "");

/**
 * 取客户端 IP（空值返回空串）
 * @param {import("express").Request} req
 */
const getClientIp = (req) => {
  if (!req) return "";
  return normalizeIp(req.ip || req.socket?.remoteAddress || "");
};

module.exports = { getClientIp };
