#!/usr/bin/env node
/**
 * 运行时一致性体检（check-runtime）—— 在**服务器上**跑，读 docker 与真实接口，只读不改
 *
 * 与 preflight.mjs 的分工（两者不重叠）：
 *   · preflight  = 「只看 .env.docker 里的字」—— 纯静态、离线、上线前跑
 *   · check-runtime = 「那些字有没有真的进容器 / 库里」—— 需要 docker 与运行中的服务
 *
 * 它专门覆盖 preflight 的盲区，也就是本次上线真实踩到的三类事故：
 *   ① BLOGGER_PASSWORD 在 .env.docker 里设了强口令，但 compose 漏传该变量
 *      → preflight 报 [ok]，容器里根本没有这个变量，账号实际用的是公开仓库里的 admin123
 *   ② BLOGGER_USERNAME 漏传 → 按用户名查博主的路径静默回退到 "admin"
 *      → 评论 / 留言通知收件人查不到人，「邮件通知」面板显示「收件人为空」
 *   ③ 容器内 BLOGGER_USERNAME 与库里的 blogger.username 不一致 → 同上，但更隐蔽
 *
 * 用法（在服务器 /opt/myblog 下执行）：
 *   node scripts/check-runtime.mjs             # 全量输出
 *   node scripts/check-runtime.mjs --quiet     # 只输出问题（[error] / [warn]）
 *   node scripts/check-runtime.mjs --env-file=.env.docker --compose-file=docker-compose.yml
 *
 * 退出码：0 = 无阻断问题 / 1 = 检出阻断问题 / 2 = 用法错误（含「docker 不可用」）
 *
 * 纪律：绝不打印密钥值（只打印长度 / 是否为空）——与 preflight.mjs 同一口径。
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────
// 参数与路径
// ─────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(
    [
      "用法: node scripts/check-runtime.mjs [--env-file=<路径>] [--compose-file=<路径>] [--quiet]",
      "",
      "  --env-file=<路径>     与容器比对的环境文件，默认 ./.env.docker",
      "  --compose-file=<路径> compose 文件（用于取服务名与兜底默认值），默认 ./docker-compose.yml",
      "  --quiet              只输出 [error] / [warn]（CI / 定时任务用）",
      "",
      "退出码: 0 无阻断 / 1 有阻断 / 2 用法错误（含 docker 不可用）",
    ].join("\n"),
  );
  process.exit(0);
}

const envFileArg = args.find((a) => a.startsWith("--env-file="));
const ENV_FILE = path.resolve(
  REPO_ROOT,
  envFileArg ? envFileArg.slice("--env-file=".length) : ".env.docker",
);
const composeFileArg = args.find((a) => a.startsWith("--compose-file="));
const COMPOSE_FILE = path.resolve(
  REPO_ROOT,
  composeFileArg
    ? composeFileArg.slice("--compose-file=".length)
    : "docker-compose.yml",
);
const QUIET = args.includes("--quiet");

const unknown = args.filter(
  (a) =>
    !a.startsWith("--env-file=") &&
    !a.startsWith("--compose-file=") &&
    !a.startsWith("--"),
);
if (unknown.length > 0) {
  console.error(`用法错误：无法识别的参数 ${unknown.join(" ")}`);
  process.exit(2);
}

// ─────────────────────────────────────────────
// 结果收集（输出风格与 preflight.mjs 保持一致）
// ─────────────────────────────────────────────

const findings = [];
const add = (level, message, fix) =>
  findings.push({ level, message, fix: fix || "" });
const error = (m, f) => add("error", m, f);
const warn = (m, f) => add("warn", m, f);
const info = (m, f) => add("info", m, f);
const ok = (m) => add("ok", m);

// ─────────────────────────────────────────────
// docker 可用性（不可用不能静默降级成「全部通过」）
// ─────────────────────────────────────────────

const docker = (cmdArgs, { allowFail = false } = {}) => {
  try {
    return execFileSync("docker", cmdArgs, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (err) {
    if (allowFail) return null;
    throw err;
  }
};

const compose = (cmdArgs, { allowFail = false } = {}) => {
  const base = ["compose", "--env-file", ENV_FILE, "-f", COMPOSE_FILE];
  try {
    return execFileSync("docker", [...base, ...cmdArgs], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      cwd: REPO_ROOT,
    }).trim();
  } catch (err) {
    if (allowFail) return null;
    throw err;
  }
};

if (
  docker(["version", "--format", "{{.Server.Version}}"], {
    allowFail: true,
  }) === null
) {
  console.error(
    [
      "用法错误：本机 docker 不可用（没有 docker 命令，或连不上 docker daemon）。",
      "本脚本检查的是「运行中的容器」，必须在装了 docker 的服务器上执行；",
      "只想看配置文件的话请用：node scripts/preflight.mjs",
    ].join("\n"),
  );
  process.exit(2);
}

// ─────────────────────────────────────────────
// 读取 .env 与模板（复用 preflight.mjs 的解析口径）
// ─────────────────────────────────────────────

const parseEnvFile = (file) => {
  const out = {};
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
};

if (!fs.existsSync(ENV_FILE)) {
  error(
    `找不到配置文件：${ENV_FILE}`,
    "在服务器上它应当已就位（可由本地 scp 上来）：scp .env.docker <服务器>:/opt/myblog/",
  );
}
const env = fs.existsSync(ENV_FILE) ? parseEnvFile(ENV_FILE) : {};
/** 目标是「文件里有、容器里没有」→ 值必须原样比，不做 trim 之外的归一 */
const envValue = (key) => env[key] ?? "";

// ─────────────────────────────────────────────
// 1. 容器状态
// ─────────────────────────────────────────────

const EXPECTED_SERVICES = [
  "myblog-mysql",
  "myblog-redis",
  "myblog-meilisearch",
  "myblog-backend",
  "myblog-blog",
  "myblog-admin",
  "myblog-backup",
];

let liveContainers = "";
{
  const psOut = docker(["ps", "-a", "--format", "{{.Names}}\t{{.Status}}"], {
    allowFail: true,
  });
  if (psOut === null) {
    error("docker ps 执行失败", "确认当前用户在 docker 组里（或 sudo 执行）");
  } else {
    liveContainers = psOut;
    const lines = psOut.split(/\r?\n/).filter(Boolean);
    const byName = new Map(
      lines.map((l) => {
        const [name, ...rest] = l.split("\t");
        return [name, rest.join("\t")];
      }),
    );

    const missing = [];
    const notUp = [];
    const restarting = [];
    for (const name of EXPECTED_SERVICES) {
      const status = byName.get(name);
      if (!status) {
        missing.push(name);
      } else if (/Restarting|Exited|Dead/i.test(status)) {
        restarting.push(`${name}（${status}）`);
      } else if (!/^Up\b/.test(status)) {
        notUp.push(`${name}（${status}）`);
      }
    }
    if (missing.length > 0) {
      error(
        `这些容器不存在：${missing.join(" / ")}`,
        "cd /opt/myblog 后用 docker compose --env-file .env.docker up -d 启动",
      );
    }
    if (restarting.length > 0) {
      error(
        `这些容器在反复重启或已退出：${restarting.join(" / ")}`,
        "docker logs --tail 50 <容器名> 看原因（常见是端口占用 / 数据库没起来）",
      );
    }
    if (notUp.length > 0) {
      warn(
        `这些容器状态不是 Up：${notUp.join(" / ")}`,
        "docker inspect --format '{{.State.Health.Status}}' <容器名> 看健康检查",
      );
    }
    if (missing.length === 0 && restarting.length === 0 && notUp.length === 0) {
      ok(`七个容器全部 Up（${EXPECTED_SERVICES.length} 个）`);
    }
  }
}

// ─────────────────────────────────────────────
// 2. /health 五个分块
// ─────────────────────────────────────────────

const HEALTH_URL = process.env.HEALTH_URL || "http://127.0.0.1:3000/health";
const HEALTH_EXPECTED_OK = [
  "database",
  "redis",
  "meilisearch",
  "mail",
  "imageVariants",
];

let health = null;
{
  try {
    const res = await fetch(HEALTH_URL, {
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "myblog-check-runtime/1.0" },
    });
    health = await res.json();
  } catch (err) {
    error(
      `健康检查取不到：${HEALTH_URL} —— ${err?.message || err}`,
      "确认反代与后端都在跑；本机直连后端时用 HEALTH_URL=http://127.0.0.1:3000/health",
    );
  }
}

if (health) {
  for (const block of HEALTH_EXPECTED_OK) {
    const value = health[block];
    if (!value) {
      error(
        `/health 缺少 ${block} 分块`,
        "确认后端版本与 scripts/smoke.mjs 的一致",
      );
      continue;
    }
    const status = typeof value === "string" ? value : value.status;
    if (status === "ok") {
      ok(`/health ${block}: ok`);
    } else if (
      block === "mail" ||
      block === "imageVariants" ||
      block === "meilisearch"
    ) {
      // 这三块允许「未配置」，但不允许 error / unavailable 这类「配了却没生效」
      if (status === "not_configured" || status === "disabled") {
        warn(
          `/health ${block}: ${status}${value.reason ? `（${value.reason}）` : ""}`,
          block === "mail"
            ? "SMTP 未配置则评论 / 留言通知全部不发；确认只填了 SMTP_HOST/USER/PASS 中的一部分"
            : "若是未安装依赖导致的 disabled，属预期；否则按提示补配置",
        );
      } else {
        error(
          `/health ${block}: ${status}${value.reason ? `（${value.reason}）` : ""}`,
          "这一块会静默降级（搜索退化成 LIKE / 图片不出变体），按 reason 修配置",
        );
      }
    } else {
      error(`/health ${block}: ${status}`, "按 docker logs 排查对应容器");
    }
  }
}

// ─────────────────────────────────────────────
// 3. 环境变量三方比对（文件 / 容器 / 模板）
// ─────────────────────────────────────────────

/**
 * 取某个容器里的全部环境变量。用 `docker compose exec` 而不是 `docker inspect`：
 * inspect 里同时有镜像 ENV 与 compose 注入值，混在一起分不清哪些来自 .env.docker。
 */
const containerEnv = (service) => {
  const out = compose(["exec", "-T", service, "printenv"], { allowFail: true });
  if (out === null) return null;
  const map = {};
  for (const line of out.split(/\r?\n/)) {
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    map[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return map;
};

// 只比对「我们关心的白名单键」，避免把容器的系统变量（PATH / HOSTNAME…）当成差异
const templateFile = `${ENV_FILE}.example`;
let templateKeys = [];
if (fs.existsSync(templateFile)) {
  templateKeys = Object.keys(parseEnvFile(templateFile));
} else {
  info(
    `未找到模板 ${path.basename(templateFile)}，白名单改为取配置文件自身的键`,
  );
  templateKeys = Object.keys(env);
}

const RUNTIME_SERVICES = ["myblog-backend", "myblog-blog", "myblog-backup"];
{
  let compared = 0;
  for (const service of RUNTIME_SERVICES) {
    const inside = containerEnv(service);
    if (inside === null) {
      warn(
        `取不到 ${service} 的环境变量（容器可能没在跑）`,
        "docker compose ps 确认后重跑本脚本",
      );
      continue;
    }
    compared += 1;

    // ⚠️ 不要拿「全部模板键」逐项比：模板里的键不是每个服务都需要。
    // 改为「这个容器的环境里已经出现了的键」才是它该拿到的集合，
    // 而「文件里有值、容器里的键在模板里、却没进这个容器」= 漏传或该服务不需要。
    // 为避免误报，只检查下面这份「必须进容器」的清单。
    const REQUIRED_IN = {
      "myblog-backend": [
        "DB_PASSWORD",
        "DB_NAME",
        "JWT_SECRET",
        "BLOGGER_USERNAME",
        "BLOGGER_PASSWORD",
        "BLOGGER_NICKNAME",
        "BLOGGER_EMAIL",
        "TZ",
        "SMTP_HOST",
        "SMTP_USER",
        "SMTP_PASS",
      ],
      "myblog-blog": ["NUXT_API_BASE", "NUXT_SITE_URL", "TZ"],
      "myblog-backup": [
        "DB_PASSWORD",
        "DB_NAME",
        "BACKUP_DIR",
        "RCLONE_REMOTE",
        "TZ",
      ],
    }[service];

    const notInContainer = [];
    const different = [];
    for (const key of REQUIRED_IN) {
      const fileValue = envValue(key);
      const containerHas = Object.prototype.hasOwnProperty.call(inside, key);
      const containerValue = inside[key] ?? "";
      if (!containerHas) {
        // 文件里本来就没填（且不是模板里必需的）→ 由 compose 兜底，不算漏传
        if (fileValue === "" && !templateKeys.includes(key)) continue;
        notInContainer.push(key);
      } else if (fileValue !== "" && containerValue !== fileValue) {
        different.push(key);
      }
    }

    if (notInContainer.length > 0) {
      error(
        `${service} 容器里没有这些环境变量（.env.docker 里有值/模板声明过）：${notInContainer.join(" / ")}`,
        "compose 的 environment: 段漏传 → 补上后 docker compose up -d <服务>（exec 不会重读 --env-file）",
      );
    }
    if (different.length > 0) {
      warn(
        `${service} 容器内的值与 .env.docker 不同：${different.join(" / ")}`,
        "容器建于配置修改之前（docker compose exec 读的是创建时注入的值）→ docker compose up -d <服务> 重建",
      );
    }
    if (notInContainer.length === 0 && different.length === 0) {
      ok(
        `${service} 的关键环境变量与 .env.docker 一致（${REQUIRED_IN.length} 项）`,
      );
    }
  }
  if (compared === 0) {
    warn("没有任何容器可供环境变量比对", "先起服务再跑本脚本");
  }
}

// ─────────────────────────────────────────────
// 4. 模板 key 差异（新键会静默走 compose 兜底默认值）
// ─────────────────────────────────────────────

if (
  fs.existsSync(templateFile) &&
  !path.basename(ENV_FILE).endsWith(".example")
) {
  const templateEnv = parseEnvFile(templateFile);
  const missing = Object.keys(templateEnv).filter((k) => !(k in env));
  if (missing.length > 0) {
    warn(
      `模板里有 ${missing.length} 个配置项，配置里没有：${missing.join(" / ")}`,
      "会静默采用 compose 的兜底默认值：逐项确认可接受，或从模板补进来",
    );
  } else {
    ok("配置项已覆盖模板的全部键");
  }
}

// ─────────────────────────────────────────────
// 5. BLOGGER_USERNAME（容器内）vs blogger.username（库）逐字比对
// ─────────────────────────────────────────────

{
  const backendEnv = containerEnv("myblog-backend");
  const containerUser = backendEnv ? (backendEnv.BLOGGER_USERNAME ?? "") : null;

  const dbUser = (() => {
    const out = compose(
      [
        "exec",
        "-T",
        "myblog-mysql",
        "sh",
        "-c",
        'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N -B -e "SELECT username FROM blogger ORDER BY id LIMIT 1" "$MYSQL_DATABASE"',
      ],
      { allowFail: true },
    );
    if (out === null) return null;
    const lines = out.split(/\r?\n/).filter(Boolean);
    return lines.length > 0 ? lines[lines.length - 1].trim() : "";
  })();

  if (containerUser === null || dbUser === null) {
    warn(
      "无法完成「容器内 BLOGGER_USERNAME vs 库里的 blogger.username」比对",
      "确认 myblog-backend 与 myblog-mysql 都在跑",
    );
  } else if (dbUser === "") {
    warn(
      "blogger 表为空（博主账号还没创建）",
      "首次启动时 initBlogger 会按 .env.docker 创建；若一直为空，看后端启动日志",
    );
  } else if (containerUser === "") {
    error(
      `容器内 BLOGGER_USERNAME 为空，而库里是 ${dbUser}`,
      "按用户名查博主的路径会回退到 admin → 评论 / 留言通知查不到收件人（后台「邮件通知」显示收件人为空）",
    );
  } else if (containerUser !== dbUser) {
    error(
      `容器内 BLOGGER_USERNAME=「${containerUser}」与库里的「${dbUser}」不一致`,
      "改 .env.docker 后必须 docker compose up -d myblog-backend 重建；两者不一致会让通知静默断链",
    );
  } else {
    ok(`容器内 BLOGGER_USERNAME 与库里的 blogger.username 一致（${dbUser}）`);
  }
}

// ─────────────────────────────────────────────
// 6. 备份新鲜度
// ─────────────────────────────────────────────

{
  // ⚠️ 不要在宿主机上拿「容器的 ls 时间」与「宿主机的 date」相减：
  //    容器时区与宿主机可能不同，会算出偏 8 小时的假结论。改为**在容器内**用 find -mmin 判断。
  const out = compose(
    [
      "exec",
      "-T",
      "myblog-backup",
      "sh",
      "-c",
      [
        "set -- $(ls -1t /backups/*.sql.gz 2>/dev/null)",
        'echo "COUNT=$#"',
        'if [ $# -gt 0 ]; then echo "NEWEST=$1"; ls -ln --time-style=long-iso "$1" 2>/dev/null; fi',
        'echo "STALE=$(find /backups -maxdepth 1 -name "*.sql.gz" -mmin +2880 2>/dev/null | wc -l)"',
        'echo "TOTAL=$(ls -1 /backups/*.sql.gz 2>/dev/null | wc -l)"',
      ].join("; "),
    ],
    { allowFail: true },
  );

  if (out === null) {
    warn(
      "取不到备份目录信息（myblog-backup 没在跑？）",
      "docker compose ps myblog-backup",
    );
  } else {
    const field = (name) => {
      const m = new RegExp(`^${name}=(.*)$`, "m").exec(out);
      return m ? m[1].trim() : "";
    };
    const total = Number(field("TOTAL") || "0");
    const stale = Number(field("STALE") || "0");
    const newest = field("NEWEST");
    // ls -ln 的字段：权限 链接数 属主 属组 大小 日期 时间 名称
    const sizeField =
      /\s(\d+)\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s/.exec(out)?.[1] ?? "";
    const timeField = /\s(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s/.exec(out);

    if (total === 0) {
      error(
        "备份目录里没有任何 .sql.gz（数据库备份一次都没成功过）",
        "docker compose exec myblog-backup bash /scripts/backup.sh 手动跑一次看报错",
      );
    } else if (stale >= total) {
      warn(
        `所有 ${total} 个数据库备份都超过 48 小时未更新（最新：${newest}）`,
        "检查 crontab：docker compose exec myblog-backup crontab -l；再看 /var/log/myblog-backup.log",
      );
    } else {
      ok(
        `数据库备份 ${total} 份，最新 ${newest}${timeField ? `（${timeField[1]} ${timeField[2]}）` : ""}${sizeField ? ` ${sizeField} 字节` : ""}`,
      );
    }
    if (sizeField && Number(sizeField) < 2048) {
      warn(
        `最新备份只有 ${sizeField} 字节 —— 若站点本身没文章则正常，否则要看内容摘要`,
        "docker compose exec myblog-backup bash /scripts/verify-backup.sh 看表数与 article 行数",
      );
    }
  }
}

// ─────────────────────────────────────────────
// 7. 端口绑定（只该绑回环）
// ─────────────────────────────────────────────

{
  const bindAddr = envValue("BIND_ADDR") || "127.0.0.1";
  const PORT_LIST = ["3000", "3001", "3002", "3307", "6379", "7700"];

  // 主口径用 `docker ps` 的端口映射：它直接反映 BIND_ADDR 的效果（谁绑在哪个宿主地址），
  // 且不需要 root、不需要容器里装 netstat、Windows 与 Linux 一致。
  // ss / netstat 只作兜底（容器没起来时仍能看到有没有别的进程占了这些端口）。
  const mappings = [];
  const psPorts = docker(["ps", "--format", "{{.Names}}\t{{.Ports}}"], {
    allowFail: true,
  });
  if (psPorts !== null) {
    for (const line of psPorts.split(/\r?\n/).filter(Boolean)) {
      const [name, ...rest] = line.split("\t");
      const ports = rest.join("\t");
      for (const part of ports.split(",")) {
        const m = /^\s*([\d.[\]:a-fA-F]+):(\d+)->/.exec(part.trim());
        if (m) mappings.push({ name, addr: m[1], hostPort: m[2] });
      }
    }
  }

  const relevant = mappings.filter((m) => PORT_LIST.includes(m.hostPort));
  if (relevant.length > 0) {
    const bad = relevant.filter(
      (m) => !/^(127\.0\.0\.1|\[::1\]|::1)$/.test(m.addr),
    );
    if (bad.length > 0) {
      warn(
        `这些端口不是只绑回环：${bad.map((m) => `${m.name} ${m.addr}:${m.hostPort}`).join(" | ")}`,
        `BIND_ADDR 应保持 127.0.0.1（当前 ${bindAddr}）；改完 docker compose up -d 重建对应服务`,
      );
    } else {
      ok(
        `应用端口均绑在回环地址（${relevant.map((m) => `${m.hostPort}`).join(" / ")}）`,
      );
    }
  } else {
    const listenOut = (() => {
      for (const cmd of [
        ["ss", ["-tlnH"]],
        ["ss", ["-tln"]],
        ["netstat", ["-tln"]],
      ]) {
        try {
          return execFileSync(cmd[0], cmd[1], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
          });
        } catch {
          /* 换下一个 */
        }
      }
      return null;
    })();

    if (listenOut === null) {
      warn(
        "看不到任何应用端口的宿主映射（容器没起来，且本机没有 ss / netstat）",
        `服务起来后本项会自动检查；也可手工核对 ss -tln 是否为 ${bindAddr}`,
      );
    } else {
      const lines = listenOut
        .split(/\r?\n/)
        .filter((l) => new RegExp(`:(${PORT_LIST.join("|")})\\s`).test(l));
      const bad = lines.filter((l) => !/(127\.0\.0\.1|\[::1\]|::1):/.test(l));
      if (bad.length > 0) {
        warn(
          `这些端口不是只绑回环：${bad.map((l) => l.trim()).join(" | ")}`,
          `BIND_ADDR 应保持 127.0.0.1（当前 ${bindAddr}）`,
        );
      } else if (lines.length > 0) {
        ok(`应用端口均绑在回环地址（${lines.length} 条监听记录）`);
      } else {
        warn(
          "没看到任何应用端口在监听（3000-3002 / 3307 / 6379 / 7700）",
          "确认服务已启动；若监听列表格式与预期不同，本项仅供参考",
        );
      }
    }
  }
}

// ─────────────────────────────────────────────
// 输出
// ─────────────────────────────────────────────

{
  const label = {
    error: "[error]",
    warn: "[warn ]",
    info: "[info ]",
    ok: "[ok   ]",
  };
  const errors = findings.filter((f) => f.level === "error");
  const warns = findings.filter((f) => f.level === "warn");

  console.log("=".repeat(70));
  console.log("运行时一致性体检 check-runtime");
  console.log(`配置文件：${ENV_FILE}`);
  console.log(`健康检查：${HEALTH_URL}`);
  console.log("=".repeat(70));

  for (const level of QUIET
    ? ["error", "warn"]
    : ["error", "warn", "ok", "info"]) {
    const group = findings.filter((f) => f.level === level);
    if (group.length === 0) continue;
    if (level === "error") console.log("");
    for (const f of group) {
      console.log(`${label[f.level]} ${f.message}`);
      if (f.fix) console.log(`        → ${f.fix}`);
    }
  }

  console.log("");
  console.log("-".repeat(70));
  console.log(
    `合计：阻断 ${errors.length} 项 / 警告 ${warns.length} 项 / 通过 ${findings.filter((f) => f.level === "ok").length} 项`,
  );
  if (errors.length > 0) {
    console.log("结论：存在阻断问题（配置没真正生效一类的问题优先处理）。");
  } else if (warns.length > 0) {
    console.log("结论：无阻断问题；请确认每条 [warn] 都是有意接受的。");
  } else {
    console.log("结论：运行时与配置一致。");
  }
  console.log("-".repeat(70));

  process.exitCode = errors.length > 0 ? 1 : 0;
}
