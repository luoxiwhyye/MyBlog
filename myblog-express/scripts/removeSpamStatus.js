/**
 * 评论 / 留言「状态-垃圾（spam）」收敛 · 数据迁移脚本
 *
 * 背景：`spam` 这一档在当前实现里没有任何独立价值 ——
 *   1. 前台只认 `approved` → 标为 spam 与 pending / deleted 的前台效果完全相同；
 *   2. 后台默认列表只排除 `deleted`、**不排除 spam** → 标为垃圾后仍混在默认列表里；
 *   3. 回收站只取 `deleted` → 垃圾**不在回收站**，只能靠筛选手动找，
 *      反而比「移入回收站」更难找回；
 *   4. 没有任何自动打 spam 的逻辑 → 使用频率天然为零。
 * 因此把它收敛掉，moderation 只保留 pending / approved / deleted 三档
 * （「移入回收站」已完整覆盖「屏蔽 + 可恢复」的需求）。
 *
 * 用途（幂等，可重复执行）：
 *   1. 检查 `comment` / `message_board` 的 `status` 列是否还含 `spam`，不含则跳过（已迁移）；
 *   2. 若含：先处理**存量 spam 行**（见下方「存量处理」），再 `ALTER` 收敛枚举；
 *   3. 打印迁移前后的状态分布。
 *
 * 存量处理（重要）：
 *   DB 处于 STRICT_TRANS_TABLES 时，若枚举里还留着 `spam` 值就直接 ALTER 会报错，
 *   所以**必须先迁走存量**。本脚本不会替你猜「这条垃圾该不该展示」：
 *     - 存量 > 0 且未显式指定目标 → **中止并打印明细**，要求你决定后重跑；
 *     - `--to=pending`（默认语义）= 退回审核队列，作者可在默认列表逐条重判；
 *     - `--to=deleted`         = 移入回收站，前台不显示、可随时恢复。
 *   两个目标都不会丢内容（deleted 也可恢复），只是「交回给谁看」不同。
 *
 * 用法（在 myblog-express 目录执行）：
 *   node scripts/removeSpamStatus.js              查看当前枚举与状态分布（不对含存量的库动手）
 *   node scripts/removeSpamStatus.js --to=pending 把存量 spam 退回待审核，然后收敛枚举
 *   node scripts/removeSpamStatus.js --to=deleted 把存量 spam 移入回收站，然后收敛枚举
 *   node scripts/removeSpamStatus.js -h           查看帮助
 *
 * 只预览不执行（与 addUniqueNames.js / clearCache.js 的约定一致）：
 *   $env:DRY_RUN=1; node scripts/removeSpamStatus.js --to=pending
 *
 * 全新部署直接导入 myblog-1.1.sql 即可（该文件已不含 spam），无需本脚本。
 */

require("dotenv").config();

const pool = require("../config/database");

const TABLES = [
  { table: "comment", comment: "评论状态" },
  { table: "message_board", comment: "留言状态" },
];

/** 收敛后的三档（顺序与 myblog-1.1.sql 保持一致） */
const STATUS_ENUM = "enum('pending','approved','deleted')";
/** 迁移前的四档（用于识别「还没迁移」的库） */
const STATUS_ENUM_WITH_SPAM = "enum('pending','approved','spam','deleted')";
const VALID_TARGETS = ["pending", "deleted"];

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

const line = (char = "─", length = 64) => char.repeat(length);

const HELP = [
  "评论 / 留言「状态-垃圾（spam）」收敛迁移脚本",
  "",
  "用法：",
  "  node scripts/removeSpamStatus.js              查看当前枚举与状态分布（只读）",
  "  node scripts/removeSpamStatus.js --to=pending 存量 spam 退回待审核，然后收敛枚举",
  "  node scripts/removeSpamStatus.js --to=deleted 存量 spam 移入回收站，然后收敛枚举",
  "  node scripts/removeSpamStatus.js -h, --help   查看帮助",
  "",
  "只预览不执行：",
  "  $env:DRY_RUN=1; node scripts/removeSpamStatus.js --to=pending",
  "",
  "说明：存量 spam 会被迁到 --to 指定的状态（默认不对含存量的库动手，需显式指定）。",
].join("\n");

/* ------------------------------------------------------------------ */
/* 参数解析                                                            */
/* ------------------------------------------------------------------ */

const parseArgs = (argv) => {
  const opts = { to: null, help: false };

  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") {
      opts.help = true;
    } else if (arg.startsWith("--to=")) {
      const value = arg.slice("--to=".length).trim().toLowerCase();
      if (!VALID_TARGETS.includes(value)) {
        return {
          error: `不支持 --to=${value}，可选值：${VALID_TARGETS.join(" / ")}`,
        };
      }
      opts.to = value;
    } else {
      return { error: `未知参数：${arg}（用 -h 查看帮助）` };
    }
  }

  return opts;
};

/* ------------------------------------------------------------------ */
/* DB 辅助                                                             */
/* ------------------------------------------------------------------ */

const getStatusColumnType = async (conn, table) => {
  const [rows] = await conn.query(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'status'`,
    [table],
  );
  return rows[0]?.COLUMN_TYPE || "";
};

const getStatusDistribution = async (conn, table) => {
  const [rows] = await conn.query(
    `SELECT status, COUNT(*) AS count FROM \`${table}\` GROUP BY status ORDER BY count DESC`,
  );
  return rows;
};

const getSpamRows = async (conn, table) => {
  const [rows] = await conn.query(
    `SELECT id, LEFT(content, 50) AS preview, create_at AS createAt
     FROM \`${table}\` WHERE status = 'spam' ORDER BY id ASC`,
  );
  return rows;
};

const printDistribution = (table, rows) => {
  if (!rows.length) {
    console.log(`  ${table}: （空表）`);
    return;
  }
  console.log(
    `  ${table}: ${rows.map((r) => `${r.status}=${r.count}`).join("  ")}`,
  );
};

/* ------------------------------------------------------------------ */
/* 主流程                                                              */
/* ------------------------------------------------------------------ */

const run = async () => {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.error) {
    console.error(`❌ ${opts.error}`);
    process.exit(1);
  }
  if (opts.help) {
    console.log(HELP);
    return;
  }

  const conn = await pool.getConnection();
  try {
    console.log(line("="));
    console.log(`spam 状态收敛${DRY_RUN ? "（DRY_RUN：只预览，不执行）" : ""}`);
    console.log(line("="));

    // 1. 现状盘点
    console.log("\n【迁移前】");
    const pending = [];
    for (const { table } of TABLES) {
      const columnType = await getStatusColumnType(conn, table);
      if (!columnType) {
        console.log(`  ⚠️ ${table} 不存在或没有 status 列，跳过`);
        continue;
      }
      printDistribution(table, await getStatusDistribution(conn, table));
      console.log(`    ${table}.status = ${columnType}`);

      if (!columnType.includes("spam")) {
        console.log(`    → 已不含 spam，无需迁移`);
        continue;
      }
      pending.push(table);
    }

    if (!pending.length) {
      console.log("\n✅ 两个表均已完成收敛，无需操作。");
      return;
    }

    // 2. 存量 spam 明细与目标校验
    const spamDetail = [];
    let spamTotal = 0;
    for (const table of pending) {
      const rows = await getSpamRows(conn, table);
      spamTotal += rows.length;
      if (rows.length) spamDetail.push({ table, rows });
    }

    console.log(`\n【存量 spam】共 ${spamTotal} 条`);
    for (const { table, rows } of spamDetail) {
      console.log(`  ${table}:`);
      for (const r of rows) {
        console.log(`    #${r.id} ${r.createAt} :: ${r.preview}`);
      }
    }
    if (!spamTotal) console.log("  （无，枚举可直接收敛）");

    if (spamTotal > 0 && !opts.to) {
      console.error(
        [
          "",
          line("!"),
          `❌ 存在 ${spamTotal} 条存量 spam，但未指定迁移目标 —— 已中止，未做任何改动。`,
          "",
          "   请先决定这些内容该去哪，再重跑：",
          "     --to=pending  退回审核队列（前台不显示，作者可在默认列表重新决定）",
          "     --to=deleted  移入回收站（前台不显示，可随时恢复）",
          line("!"),
        ].join("\n"),
      );
      process.exit(1);
    }

    const target = opts.to || "pending";

    if (DRY_RUN) {
      console.log(
        `\n[DRY_RUN] 将执行：① 存量 ${spamTotal} 条 spam → ${target}；` +
          `② 收敛枚举：${pending.join(" / ")}`,
      );
      console.log("\n（DRY_RUN 未做任何改动）");
      return;
    }

    // 3. 迁走存量（必须在 ALTER 之前：STRICT_TRANS_TABLES 下枚举里还有值也不影响
    //    UPDATE，但值一旦被移除就写不进去了，顺序不能颠倒）
    if (spamTotal > 0) {
      console.log(`\n【迁移存量】spam → ${target}`);
      for (const table of pending) {
        const [result] = await conn.query(
          `UPDATE \`${table}\` SET status = ? WHERE status = 'spam'`,
          [target],
        );
        console.log(`  ${table}: 已迁移 ${result.affectedRows} 条`);
      }
    }

    // 4. 收敛枚举
    console.log("\n【收敛枚举】");
    for (const { table, comment } of TABLES) {
      if (!pending.includes(table)) continue;
      await conn.query(
        `ALTER TABLE \`${table}\`
         MODIFY COLUMN \`status\` ${STATUS_ENUM}
         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
         NOT NULL DEFAULT 'pending' COMMENT '${comment}'`,
      );
      console.log(`  ${table}.status → ${STATUS_ENUM}`);
    }

    // 5. 复核
    console.log("\n【迁移后】");
    for (const { table } of TABLES) {
      if (!pending.includes(table)) continue;
      printDistribution(table, await getStatusDistribution(conn, table));
      console.log(
        `    ${table}.status = ${await getStatusColumnType(conn, table)}`,
      );
    }

    console.log(`\n✅ 完成。spam 已收敛为 ${STATUS_ENUM}`);
  } finally {
    conn.release();
  }
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ 迁移失败:", err.message);
    process.exit(1);
  });
