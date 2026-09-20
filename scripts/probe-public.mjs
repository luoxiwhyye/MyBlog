#!/usr/bin/env node
/**
 * 公网可达性探测（probe-public）—— 在**部署者本机**跑，不在服务器上跑
 *
 * 它回答的是「外面的人到底能不能连上这组域名」，并且把 IPv4 与 IPv6 **分开**报告。
 * 为什么必须分开（本次连续误判三次的真实过程）：
 *   443 不通时我先后怀疑云安全组、防火墙，最后发现真因是**云安全组的 443 规则只加了 IPv6**
 *   —— 而「在服务器上 curl 返回 HTTP/2 200」这个假象是服务器自己走 IPv6 命中了放行的规则。
 *   于是：**本机测通 ≠ 外网 IPv4 能通**，必须按协议族分列。
 *
 * 用法：
 *   node scripts/probe-public.mjs blog.example.com admin.example.com
 *   node scripts/probe-public.mjs --timeout=5000 example.com
 *
 * 退出码：0 = 每个域名在 IPv4 上至少 80/443 之一可连 / 1 = 有域名 IPv4 完全不可达 / 2 = 用法错误
 *
 * 边界：只测**可达性**（TCP 能否建连），不打 HTTPS 内容、不校验证书 —— 证书与页面内容
 * 是另一件事，由 scripts/smoke.mjs 负责。
 */

import net from "node:net";
import dns from "node:dns";
import os from "node:os";

// ─────────────────────────────────────────────
// 参数
// ─────────────────────────────────────────────

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  console.log(
    [
      "用法: node scripts/probe-public.mjs [--timeout=<ms>] <域名> [域名...]",
      "",
      "  --timeout=<ms>  单次 TCP 连接超时，默认 6000",
      "",
      "退出码: 0 每个域名 IPv4 至少一个端口可连 / 1 有域名 IPv4 完全不可达 / 2 用法错误",
      "",
      "说明：本脚本在【部署者本机】跑，用来判断「外网能不能连上」，",
      "      而不是在服务器上跑（服务器自己可能走 IPv6，会得出假结论）。",
    ].join("\n"),
  );
  process.exit(0);
}

const timeoutArg = argv.find((a) => a.startsWith("--timeout="));
const TIMEOUT_MS = timeoutArg
  ? Number(timeoutArg.slice("--timeout=".length))
  : 6000;
if (!Number.isFinite(TIMEOUT_MS) || TIMEOUT_MS <= 0) {
  console.error("用法错误：--timeout=<ms> 需要正整数");
  process.exit(2);
}

const hosts = argv
  .filter((a) => !a.startsWith("--"))
  .map((h) =>
    h
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .trim(),
  )
  .filter(Boolean);
if (hosts.length === 0) {
  console.error("用法错误：至少要给一个域名（--help 看说明）");
  process.exit(2);
}
{
  const unknown = argv.filter((a) => !a.startsWith("--"));
  const bad = unknown.filter((h) => h.includes("/") || h.includes(" "));
  if (bad.length > 0) {
    console.error(`用法错误：这些参数不像域名：${bad.join(" ")}`);
    process.exit(2);
  }
}

const PORTS = [80, 443];

// ─────────────────────────────────────────────
// 本机协议族出口能力（用于区分「本机没有 IPv6 出口」与「服务器未放行」）
// ─────────────────────────────────────────────

const localV6Globals = (() => {
  const out = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === "IPv6" && !a.internal) out.push(`${name}:${a.address}`);
    }
  }
  return out;
})();

// ─────────────────────────────────────────────
// 结果收集（输出风格与 preflight / smoke 一致）
// ─────────────────────────────────────────────

const findings = [];
const add = (level, message, fix) =>
  findings.push({ level, message, fix: fix || "" });
const error = (m, f) => add("error", m, f);
const warn = (m, f) => add("warn", m, f);
const info = (m, f) => add("info", m, f);
const ok = (m) => add("ok", m);

// ─────────────────────────────────────────────
// DNS
// ─────────────────────────────────────────────

/**
 * 解析域名，两级回退：
 *   ① dns.resolve4/6（c-ares）：能拿到权威记录，但**不走系统 hosts 与系统解析器**。
 *      实测在开了系统代理的 Windows 上会直接 ECONNREFUSED，让整个脚本失去意义。
 *   ② dns.lookup（getaddrinfo，走系统解析器）：与 curl / 浏览器口径一致。
 * 两条都失败才算「解析不出来」，并在输出里标明用的是哪条 —— 免得把
 * 「本机解析器坏了」误判成「域名没有 A 记录」。
 */
const resolve = async (host, family) => {
  let firstError = null;
  try {
    const list =
      family === 4
        ? await dns.promises.resolve4(host)
        : await dns.promises.resolve6(host);
    if (list.length > 0) return { list, error: null, source: "dns.resolve" };
    firstError = "ENODATA";
  } catch (err) {
    firstError = err?.code || String(err);
  }

  try {
    const all = await dns.promises.lookup(host, { family, all: true });
    const list = all
      .map((a) => a.address)
      // 传 IP 字面量时 getaddrinfo 会把 IPv4 回成 ::ffff:x.x.x.x（IPv4-mapped），
      // 那不是真正的 AAAA 记录，留着会多报一次「IPv6 超时」。
      .filter((addr) => !(family === 6 && /^::ffff:/i.test(addr)));
    if (list.length > 0) {
      return { list, error: null, source: "系统解析器" };
    }
    return { list: [], error: firstError, source: "系统解析器" };
  } catch (err) {
    const code = err?.code || String(err);
    // 系统解析器说 ENOTFOUND = 真的没有这条记录（比 c-ares 的 ECONNREFUSED 更可信）；
    // 其它错误才归因到「解析器不可用」。
    const error = ["ENOTFOUND", "ENODATA"].includes(code)
      ? code
      : firstError || code;
    return { list: [], error, source: "系统解析器" };
  }
};

/** DNS 失败原因要说清是「没有记录」还是「解析器连不上」——两者修法不同 */
const describeDns = (result) => {
  if (!result.error) return "";
  if (["ENOTFOUND", "ENODATA", "NODATA"].includes(result.error)) {
    return "无记录";
  }
  if (
    [
      "ESERVFAIL",
      "EREFUSED",
      "ETIMEOUT",
      "ECONNREFUSED",
      "EBADRESP",
      "EDESTRUCTION",
    ].includes(result.error)
  ) {
    return `解析失败（${result.error}，${result.source}）—— 本机 DNS 不通，本次结果不可信`;
  }
  return `无记录（${result.error}）`;
};

// ─────────────────────────────────────────────
// TCP 连接探测（失败类型必须分清，它们的修法完全不同）
// ─────────────────────────────────────────────

const connect = (address, port, family) =>
  new Promise((resolvePromise) => {
    const started = Date.now();
    const socket = new net.Socket();
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolvePromise({ ...payload, ms: Date.now() - started });
    };

    socket.setTimeout(TIMEOUT_MS);
    socket.once("connect", () => finish({ state: "open" }));
    socket.once("timeout", () => finish({ state: "timeout" }));
    socket.once("error", (err) => {
      const code = err?.code || String(err);
      if (code === "ECONNREFUSED") return finish({ state: "refused", code });
      if (
        [
          "ENETUNREACH",
          "EHOSTUNREACH",
          "EADDRNOTAVAIL",
          "EPROTONOSUPPORT",
        ].includes(code)
      ) {
        return finish({ state: "unreachable", code });
      }
      return finish({ state: "error", code });
    });
    socket.connect({ host: address, port, family });
  });

const describe = (result, family) => {
  switch (result.state) {
    case "open":
      return `可连（${result.ms} ms）`;
    case "timeout":
      return "超时 —— 被防火墙 / 云安全组 DROP（要去控制台加规则）";
    case "refused":
      return "拒绝连接 —— 主机在，但没有进程监听这个端口（要去起服务）";
    case "unreachable":
      return family === 6 && localV6Globals.length === 0
        ? "本机没有 IPv6 出口（不是服务器的错）"
        : "网络不可达（本机到该地址没有路由）";
    default:
      return `错误 ${result.code}`;
  }
};

// ─────────────────────────────────────────────
// 逐域名探测
// ─────────────────────────────────────────────

console.log("=".repeat(70));
console.log(
  "公网可达性探测 probe-public（本机跑，用于判断「外面能不能连上」）",
);
console.log(
  `超时: ${TIMEOUT_MS} ms    本机全局 IPv6 地址: ${localV6Globals.length} 个`,
);
if (localV6Globals.length === 0) {
  console.log(
    "提示: 本机没有全局 IPv6 地址 —— IPv6 的失败结果不代表服务器有问题",
  );
}
console.log("=".repeat(70));

const table = [];
let v4AllDead = 0;

for (const host of hosts) {
  // 传 IP 字面量时不要「替它解析另一个协议族」（getaddrinfo 会回出 ::ffff:x 之类），
  // 只测它本身那一族 —— 否则汇总表里会多出几行无意义的结果。
  const literal = net.isIPv4(host) ? 4 : net.isIPv6(host) ? 6 : 0;
  const [v4, v6] =
    literal === 4
      ? [
          { list: [host], error: null, source: "IP 字面量" },
          { list: [], error: "ENODATA", source: "IP 字面量" },
        ]
      : literal === 6
        ? [
            { list: [], error: "ENODATA", source: "IP 字面量" },
            { list: [host], error: null, source: "IP 字面量" },
          ]
        : await Promise.all([resolve(host, 4), resolve(host, 6)]);
  console.log("");
  console.log(`── ${host} ──`);
  console.log(
    `  A    (IPv4): ${v4.list.length > 0 ? `${v4.list.join(", ")}（${v4.source}）` : describeDns(v4) || "无记录"}`,
  );
  console.log(
    `  AAAA (IPv6): ${v6.list.length > 0 ? `${v6.list.join(", ")}（${v6.source}）` : describeDns(v6) || "无记录"}`,
  );

  if (v4.list.length === 0 && v6.list.length === 0) {
    const dnsBroken = [v4, v6].some((r) =>
      describeDns(r).startsWith("解析失败"),
    );
    if (dnsBroken) {
      warn(
        `${host} 解析不出地址，但更像是本机 DNS 不通（${v4.error}）`,
        "本机 DNS 有问题时所有域名的结论都不可信：先确认能解析任意域名再重跑",
      );
    } else {
      error(
        `${host} 既没有 A 记录也没有 AAAA 记录`,
        "确认域名解析已生效（dig +short <域名> / 云解析控制台看记录是否已生效）",
      );
    }
    continue;
  }

  const families = [
    { family: 4, addrs: v4.list },
    { family: 6, addrs: v6.list },
  ];

  let v4Open = false;
  const v6Timeouts = [];
  for (const { family, addrs } of families) {
    if (addrs.length === 0) {
      table.push({ host, family, port: 80, result: "无记录" });
      table.push({ host, family, port: 443, result: "无记录" });
      continue;
    }
    for (const port of PORTS) {
      const result = await connect(addrs[0], port, family);
      const text = describe(result, family);
      table.push({ host, family, port, result: text });
      console.log(`  IPv${family} ${addrs[0]}:${port}  ${text}`);
      if (family === 4 && result.state === "open") v4Open = true;
      if (family === 6 && result.state === "timeout") v6Timeouts.push(port);
    }
  }

  // IPv6 超时只报一次（两个端口都报会把两条同样的话刷两遍）
  if (v6Timeouts.length > 0) {
    if (localV6Globals.length === 0) {
      info(
        `${host} 的 IPv6 ${v6Timeouts.join(" / ")} 超时，但本机没有全局 IPv6 地址 —— 这不是服务器的结论`,
        "要看 IPv6 是否放行，请在真的能走 IPv6 的机器上重跑本脚本",
      );
    } else {
      warn(
        `${host} 的 IPv6 ${v6Timeouts.join(" / ")} 超时（本机有 IPv6 出口）`,
        "云安全组的 80/443 规则要分 IPv4 与 IPv6 两条：确认两条都在（本次踩坑就是只有一条）",
      );
    }
  }

  // IPv4 上的结论（对外服务最要紧的一族）
  const v4Rows = table.filter((r) => r.host === host && r.family === 4);
  const v4BothDead =
    v4Rows.length === PORTS.length &&
    v4Rows.every((r) => !r.result.startsWith("可连"));
  if (v4BothDead) {
    v4AllDead += 1;
    error(
      `${host} 在 IPv4 上 80 与 443 都连不上`,
      "按上面的失败类型处理：超时 = 云安全组/防火墙 DROP；拒绝 = 主机在但服务没起",
    );
  } else if (!v4Open) {
    warn(`${host} 在 IPv4 上没有可连的端口`, "确认服务已启动且反代在监听");
  } else {
    const https = table.some(
      (r) =>
        r.host === host &&
        r.family === 4 &&
        r.port === 443 &&
        r.result.startsWith("可连"),
    );
    if (https) {
      ok(`${host} IPv4 443 可连`);
    } else {
      warn(
        `${host} IPv4 80 可连但 443 不可连`,
        "只用 HTTP 的站点属正常；否则按失败类型修（超时=安全组，拒绝=nginx 没监听 443）",
      );
    }
  }
}

// ─────────────────────────────────────────────
// 汇总表
// ─────────────────────────────────────────────

console.log("");
console.log("-".repeat(70));
console.log("汇总（域名 × 协议族 × 端口）");
console.log("-".repeat(70));
console.log(`${"域名".padEnd(28)}${"族".padEnd(6)}${"端口".padEnd(7)}结果`);
for (const row of table) {
  console.log(
    `${row.host.padEnd(28)}${`IPv${row.family}`.padEnd(6)}${String(row.port).padEnd(7)}${row.result}`,
  );
}

console.log("");
console.log("-".repeat(70));
const errors = findings.filter((f) => f.level === "error");
const warns = findings.filter((f) => f.level === "warn");
for (const level of ["error", "warn", "info", "ok"]) {
  const group = findings.filter((f) => f.level === level);
  const label = {
    error: "[error]",
    warn: "[warn ]",
    info: "[info ]",
    ok: "[ok   ]",
  }[level];
  for (const f of group) {
    console.log(`${label} ${f.message}`);
    if (f.fix) console.log(`        → ${f.fix}`);
  }
}
console.log("-".repeat(70));
console.log(
  `合计：阻断 ${errors.length} 项 / 警告 ${warns.length} 项 / 通过 ${findings.filter((f) => f.level === "ok").length} 项`,
);
console.log(
  errors.length > 0 || v4AllDead > 0
    ? "结论：外网可达性有问题，先处理 [error]，再重跑本脚本确认。"
    : warns.length > 0
      ? "结论：没有阻断项，但存在警告（可能是本机网络 / DNS 问题，也可能是安全组只放行了一个协议族）。"
      : "结论：外网 IPv4 可达。内容与证书请再用 scripts/smoke.mjs 验证。",
);
console.log("-".repeat(70));

process.exitCode = errors.length > 0 ? 1 : 0;
