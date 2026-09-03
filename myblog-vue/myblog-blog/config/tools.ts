import {
  Brush,
  Connection,
  Crop,
  DataAnalysis,
  Document,
  DocumentCopy,
  Files,
  Grid,
  Key,
  Link,
  Lock,
  MagicStick,
  Operation,
  Postcard,
  Search,
  SetUp,
  Sort,
  Tickets,
  Timer,
} from "@element-plus/icons-vue";
import type {
  ToolCategoryMeta,
  ToolCategoryId,
  ToolInputValues,
  ToolMeta,
  ToolOptionValues,
} from "~/types/tool";

const ONE_MB = 1024 * 1024;

const createPath = (category: ToolCategoryId, toolId: ToolMeta["id"]) =>
  `/tools/${category}/${toolId}`;

const baseFeatures = {
  hasCopy: true,
  hasClear: true,
  hasExample: true,
  hasExport: true,
};

const encodingTools: ToolMeta[] = [
  {
    id: "base64",
    name: "Base64 编解码",
    description: "支持 UTF-8 文本与 Base64 互转。",
    category: "encoding",
    icon: Tickets,
    keywords: ["base64", "utf8", "编码", "解码"],
    inputs: [
      {
        key: "content",
        label: "输入内容",
        type: "textarea",
        rows: 12,
        monospace: true,
        placeholder: "请输入需要编码或解码的文本",
      },
    ],
    options: [
      {
        key: "mode",
        label: "处理方式",
        type: "radio",
        defaultValue: "encode",
        options: [
          { label: "编码", value: "encode" },
          { label: "解码", value: "decode" },
        ],
      },
    ],
    features: { ...baseFeatures, hasSwap: true },
    example: {
      inputs: {
        content: "Hello, 编程工具箱！",
      },
    },
    outputFileExtension: "txt",
    outputMimeType: "text/plain;charset=utf-8",
    inputLimitBytes: ONE_MB,
  },
  {
    id: "url",
    name: "URL 编解码",
    description: "快速处理查询参数、回调地址和路径片段。",
    category: "encoding",
    icon: Link,
    keywords: ["url", "query", "encodeURIComponent", "decodeURIComponent"],
    inputs: [
      {
        key: "content",
        label: "输入内容",
        type: "textarea",
        rows: 12,
        monospace: true,
        placeholder: "例如：https://example.com/?q=编程 工具箱",
      },
    ],
    options: [
      {
        key: "mode",
        label: "处理方式",
        type: "radio",
        defaultValue: "encode",
        options: [
          { label: "编码", value: "encode" },
          { label: "解码", value: "decode" },
        ],
      },
    ],
    features: { ...baseFeatures, hasSwap: true },
    example: {
      inputs: {
        content: "https://example.com/search?q=Nuxt 工具箱&lang=zh-CN",
      },
    },
    outputFileExtension: "txt",
    outputMimeType: "text/plain;charset=utf-8",
    inputLimitBytes: ONE_MB,
  },
  {
    id: "unicode",
    name: "Unicode 转换",
    description: "将文本与 \\uXXXX 转义形式互相转换。",
    category: "encoding",
    icon: Postcard,
    keywords: ["unicode", "转义", "u4e2d"],
    inputs: [
      {
        key: "content",
        label: "输入内容",
        type: "textarea",
        rows: 12,
        monospace: true,
        placeholder: "请输入文本或 \\u4F60\\u597D",
      },
    ],
    options: [
      {
        key: "mode",
        label: "处理方式",
        type: "radio",
        defaultValue: "encode",
        options: [
          { label: "转为 Unicode", value: "encode" },
          { label: "转回文本", value: "decode" },
        ],
      },
    ],
    features: { ...baseFeatures, hasSwap: true },
    example: {
      inputs: {
        content: "你好，Nuxt 3！",
      },
    },
    outputFileExtension: "txt",
    outputMimeType: "text/plain;charset=utf-8",
    inputLimitBytes: ONE_MB,
  },
  {
    id: "html-entity",
    name: "HTML Entity 编解码",
    description: "对 HTML 特殊字符进行实体编码与还原。",
    category: "encoding",
    icon: DocumentCopy,
    keywords: ["html", "entity", "xss", "转义"],
    inputs: [
      {
        key: "content",
        label: "输入内容",
        type: "textarea",
        rows: 12,
        monospace: true,
        placeholder: '例如：<div class="note">编码 & 解码</div>',
      },
    ],
    options: [
      {
        key: "mode",
        label: "处理方式",
        type: "radio",
        defaultValue: "encode",
        options: [
          { label: "编码", value: "encode" },
          { label: "解码", value: "decode" },
        ],
      },
    ],
    features: { ...baseFeatures, hasSwap: true },
    example: {
      inputs: {
        content: '<strong title="提示">Hello & Welcome</strong>',
      },
    },
    outputFileExtension: "html",
    outputMimeType: "text/html;charset=utf-8",
    inputLimitBytes: ONE_MB,
  },
];

const formatterTools: ToolMeta[] = [
  {
    id: "json",
    name: "JSON 工具",
    description: "校验并格式化/压缩 JSON，适合接口调试和配置查看。",
    category: "formatter",
    icon: SetUp,
    keywords: ["json", "formatter", "pretty", "minify", "压缩"],
    inputs: [
      {
        key: "content",
        label: "JSON 输入",
        type: "textarea",
        rows: 14,
        monospace: true,
        placeholder: '{"name":"MyBlog","stack":["Nuxt","TypeScript"]}',
      },
    ],
    options: [
      {
        key: "mode",
        label: "处理方式",
        type: "radio",
        defaultValue: "format",
        options: [
          { label: "格式化", value: "format" },
          { label: "压缩", value: "minify" },
        ],
      },
      {
        key: "indent",
        label: "缩进空格",
        type: "select",
        defaultValue: "2",
        options: [
          { label: "2 空格", value: "2" },
          { label: "4 空格", value: "4" },
        ],
        helperText: "仅「格式化」模式生效。",
      },
    ],
    features: baseFeatures,
    example: {
      inputs: {
        content:
          '{"site":"MyBlog","features":["SEO","Tools"],"published":true}',
      },
      options: {
        mode: "format",
        indent: "2",
      },
    },
    outputFileExtension: "json",
    outputMimeType: "application/json;charset=utf-8",
    inputLimitBytes: ONE_MB,
  },
  {
    id: "sql",
    name: "SQL 格式化",
    description: "对常见 SQL 关键字进行分行和美化。",
    category: "formatter",
    icon: Grid,
    keywords: ["sql", "format", "select"],
    inputs: [
      {
        key: "content",
        label: "SQL 输入",
        type: "textarea",
        rows: 14,
        monospace: true,
        placeholder:
          "select id,name from users where status = 1 order by created_at desc",
      },
    ],
    options: [
      {
        key: "keywordCase",
        label: "关键字大小写",
        type: "radio",
        defaultValue: "upper",
        options: [
          { label: "大写", value: "upper" },
          { label: "小写", value: "lower" },
        ],
      },
    ],
    features: baseFeatures,
    example: {
      inputs: {
        content:
          "select id,name,email from users left join profiles on users.id = profiles.user_id where status = 1 and deleted_at is null order by created_at desc",
      },
    },
    outputFileExtension: "sql",
    outputMimeType: "text/plain;charset=utf-8",
    inputLimitBytes: ONE_MB,
  },
  {
    id: "xml",
    name: "XML 格式化",
    description: "快速整理 XML 文档结构，适合接口报文调试。",
    category: "formatter",
    icon: Files,
    keywords: ["xml", "format", "soap"],
    inputs: [
      {
        key: "content",
        label: "XML 输入",
        type: "textarea",
        rows: 14,
        monospace: true,
        placeholder: "<root><item id='1'>hello</item></root>",
      },
    ],
    options: [
      {
        key: "indent",
        label: "缩进空格",
        type: "select",
        defaultValue: "2",
        options: [
          { label: "2 空格", value: "2" },
          { label: "4 空格", value: "4" },
        ],
      },
    ],
    features: baseFeatures,
    example: {
      inputs: {
        content:
          "<note><to>Developer</to><from>MyBlog</from><body>Keep building useful tools.</body></note>",
      },
    },
    outputFileExtension: "xml",
    outputMimeType: "application/xml;charset=utf-8",
    inputLimitBytes: ONE_MB,
  },
];

const cryptoTools: ToolMeta[] = [
  {
    id: "md5",
    name: "MD5 生成器",
    description: "在浏览器中生成 MD5 摘要，适合简单校验场景。",
    category: "crypto",
    icon: Key,
    keywords: ["md5", "hash", "摘要"],
    inputs: [
      {
        key: "content",
        label: "输入内容",
        type: "textarea",
        rows: 10,
        monospace: true,
        placeholder: "请输入需要计算摘要的文本",
      },
    ],
    options: [],
    features: baseFeatures,
    example: {
      inputs: {
        content: "MyBlog Tools",
      },
    },
    outputFileExtension: "txt",
    outputMimeType: "text/plain;charset=utf-8",
    inputLimitBytes: ONE_MB,
  },
  {
    id: "sha",
    name: "SHA 系列哈希",
    description: "支持 SHA-1、SHA-256、SHA-512 哈希计算。",
    category: "crypto",
    icon: Lock,
    keywords: ["sha", "sha256", "sha512", "hash"],
    inputs: [
      {
        key: "content",
        label: "输入内容",
        type: "textarea",
        rows: 10,
        monospace: true,
        placeholder: "请输入需要生成哈希的文本",
      },
    ],
    options: [
      {
        key: "algorithm",
        label: "算法",
        type: "radio",
        defaultValue: "SHA-256",
        options: [
          { label: "SHA-1", value: "SHA-1" },
          { label: "SHA-256", value: "SHA-256" },
          { label: "SHA-512", value: "SHA-512" },
        ],
      },
    ],
    features: baseFeatures,
    example: {
      inputs: {
        content: "Nuxt 3 + TypeScript",
      },
    },
    outputFileExtension: "txt",
    outputMimeType: "text/plain;charset=utf-8",
    inputLimitBytes: ONE_MB,
  },
  {
    id: "timestamp",
    name: "时间戳转换",
    description: "支持 10/13 位 Unix 时间戳与日期时间互转。",
    category: "crypto",
    icon: Timer,
    keywords: ["timestamp", "unix", "date", "time"],
    inputs: [
      {
        key: "content",
        label: "输入时间",
        type: "text",
        monospace: true,
        helperText:
          "支持 10 位秒级、13 位毫秒级时间戳，或 YYYY-MM-DD HH:mm:ss。",
        placeholder: "例如：1735689600 或 2025-01-01 08:00:00",
      },
    ],
    options: [],
    features: baseFeatures,
    example: {
      inputs: {
        content: "2025-01-01 08:00:00",
      },
    },
    outputFileExtension: "txt",
    outputMimeType: "text/plain;charset=utf-8",
    inputLimitBytes: 2048,
  },
];

const textTools: ToolMeta[] = [
  {
    id: "regex",
    name: "正则测试",
    description: "测试正则表达式并高亮匹配结果。",
    category: "text",
    icon: Search,
    keywords: ["regex", "regexp", "匹配", "高亮"],
    inputs: [
      {
        key: "pattern",
        label: "正则表达式",
        type: "text",
        monospace: true,
        placeholder: "(Nuxt|Vue)\\s*\\d",
      },
      {
        key: "content",
        label: "测试文本",
        type: "textarea",
        rows: 12,
        monospace: true,
        placeholder: "Nuxt 3 makes Vue 3 development delightful.",
      },
    ],
    options: [
      {
        key: "flags",
        label: "匹配标记",
        type: "checkbox-group",
        defaultValue: ["g"],
        options: [
          { label: "g", value: "g" },
          { label: "i", value: "i" },
          { label: "m", value: "m" },
          { label: "s", value: "s" },
          { label: "u", value: "u" },
          { label: "y", value: "y" },
        ],
      },
    ],
    features: { ...baseFeatures, multiInput: true },
    example: {
      inputs: {
        pattern: "(Nuxt|Vue)\\s*\\d",
        content: "Nuxt 3 makes Vue 3 development delightful.",
      },
      options: {
        flags: ["g"],
      },
    },
    outputFileExtension: "json",
    outputMimeType: "application/json;charset=utf-8",
    inputLimitBytes: ONE_MB,
  },
  {
    id: "word-count",
    name: "字符统计",
    description: "统计字符、单词、行数、字节数等常用指标。",
    category: "text",
    icon: DataAnalysis,
    keywords: ["count", "word", "line", "byte"],
    inputs: [
      {
        key: "content",
        label: "输入文本",
        type: "textarea",
        rows: 14,
        monospace: true,
        placeholder: "请输入需要统计的文本内容",
      },
    ],
    options: [],
    features: baseFeatures,
    example: {
      inputs: {
        content:
          "Hello MyBlog!\n这是一个编程工具箱示例。\n\n支持统计字符、单词和字节数。",
      },
    },
    outputFileExtension: "json",
    outputMimeType: "application/json;charset=utf-8",
    inputLimitBytes: ONE_MB,
  },
  {
    id: "case-convert",
    name: "大小写转换",
    description: "支持 camelCase、snake_case、CONSTANT_CASE 等格式转换。",
    category: "text",
    icon: Sort,
    keywords: ["case", "camel", "snake", "kebab"],
    inputs: [
      {
        key: "content",
        label: "输入文本",
        type: "textarea",
        rows: 10,
        monospace: true,
        placeholder: "my blog toolbox",
      },
    ],
    options: [
      {
        key: "target",
        label: "目标格式",
        type: "select",
        defaultValue: "camel",
        options: [
          { label: "camelCase", value: "camel" },
          { label: "PascalCase", value: "pascal" },
          { label: "snake_case", value: "snake" },
          { label: "kebab-case", value: "kebab" },
          { label: "CONSTANT_CASE", value: "constant" },
          { label: "Title Case", value: "title" },
          { label: "UPPER CASE", value: "upper" },
          { label: "lower case", value: "lower" },
        ],
      },
    ],
    features: baseFeatures,
    example: {
      inputs: {
        content: "my awesome blog toolbox",
      },
    },
    outputFileExtension: "txt",
    outputMimeType: "text/plain;charset=utf-8",
    inputLimitBytes: ONE_MB,
  },
];

const colorTools: ToolMeta[] = [
  {
    id: "color",
    name: "颜色工具",
    description: "颜色值转换与可视化取色，输出 HEX / RGB / HSL。",
    category: "color",
    icon: Brush,
    keywords: ["color", "hex", "rgb", "hsl", "picker"],
    inputs: [
      {
        key: "content",
        label: "颜色值",
        type: "text",
        monospace: true,
        placeholder: "#409EFF 或 rgb(64, 158, 255)",
        helperText: "「输入颜色值」模式填写；「可视化取色」用下方选择器。",
      },
      {
        key: "color",
        label: "选择颜色",
        type: "color",
        placeholder: "#409EFF",
        helperText: "「可视化取色」模式使用。",
      },
    ],
    options: [
      {
        key: "mode",
        label: "输入方式",
        type: "radio",
        defaultValue: "convert",
        options: [
          { label: "输入颜色值", value: "convert" },
          { label: "可视化取色", value: "picker" },
        ],
      },
      {
        key: "format",
        label: "默认输出",
        type: "radio",
        defaultValue: "hex",
        options: [
          { label: "HEX", value: "hex" },
          { label: "RGB", value: "rgb" },
          { label: "HSL", value: "hsl" },
        ],
      },
    ],
    features: { ...baseFeatures, hasSwap: true },
    example: {
      inputs: {
        content: "#409EFF",
        color: "#409EFF",
      },
      options: {
        mode: "convert",
        format: "hex",
      },
    },
    outputFileExtension: "txt",
    outputMimeType: "text/plain;charset=utf-8",
    inputLimitBytes: 4096,
  },
];

const devTools: ToolMeta[] = [
  {
    id: "jwt-parse",
    name: "JWT 解析",
    description: "解析 JWT 的 Header/Payload 并校验 HMAC 签名。",
    category: "dev",
    icon: Key,
    keywords: ["jwt", "token", "decode", "verify", "header"],
    inputs: [
      {
        key: "token",
        label: "Token",
        type: "textarea",
        rows: 8,
        monospace: true,
        placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      },
      {
        key: "secret",
        label: "签名密钥（可选）",
        type: "text",
        monospace: true,
        placeholder: "填入 HMAC 密钥即可校验签名，留空仅解析",
        helperText: "校验 HS256/384/512；填入后显示签名是否有效。",
      },
    ],
    options: [],
    features: baseFeatures,
    example: {
      inputs: {
        token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        secret: "your-256-bit-secret",
      },
    },
    outputFileExtension: "json",
    outputMimeType: "application/json;charset=utf-8",
    inputLimitBytes: ONE_MB,
  },
  {
    id: "qr",
    name: "二维码生成",
    description: "纯前端生成二维码，支持 SVG 预览与下载。",
    category: "dev",
    icon: Postcard,
    keywords: ["qrcode", "qr", "二维码", "svg"],
    inputs: [
      {
        key: "content",
        label: "内容",
        type: "textarea",
        rows: 6,
        monospace: true,
        placeholder: "https://example.com 或任意文本",
      },
    ],
    options: [
      {
        key: "size",
        label: "尺寸",
        type: "number",
        defaultValue: 256,
        min: 64,
        max: 512,
        step: 32,
      },
    ],
    features: { ...baseFeatures, hasExport: true },
    example: {
      inputs: {
        content: "https://myblog.example.com",
      },
      options: {
        size: 256,
      },
    },
    outputMimeType: "image/svg+xml",
  },
  {
    id: "password",
    name: "密码生成器",
    description: "生成高强度随机密码，支持自定义长度与字符集。",
    category: "dev",
    icon: Lock,
    keywords: ["password", "random", "密码", "生成"],
    inputs: [],
    options: [
      {
        key: "length",
        label: "长度",
        type: "number",
        defaultValue: 16,
        min: 4,
        max: 64,
        step: 1,
      },
      {
        key: "upper",
        label: "大写字母",
        type: "switch",
        defaultValue: true,
      },
      {
        key: "lower",
        label: "小写字母",
        type: "switch",
        defaultValue: true,
      },
      {
        key: "number",
        label: "数字",
        type: "switch",
        defaultValue: true,
      },
      {
        key: "symbol",
        label: "特殊符号",
        type: "switch",
        defaultValue: true,
      },
    ],
    features: {
      ...baseFeatures,
      hasCopy: true,
      hasClear: false,
      hasExample: false,
    },
    example: {
      inputs: {},
      options: {
        length: 16,
        upper: true,
        lower: true,
        number: true,
        symbol: true,
      },
    },
    outputFileExtension: "txt",
    outputMimeType: "text/plain;charset=utf-8",
  },
  {
    id: "cron",
    name: "Cron 表达式解析",
    description: "解析 Cron 表达式并计算下次若干次执行时间。",
    category: "dev",
    icon: Timer,
    keywords: ["cron", "schedule", "定时", "表达式"],
    inputs: [
      {
        key: "expression",
        label: "Cron 表达式",
        type: "text",
        monospace: true,
        placeholder: "0 */5 * * *",
        helperText: "标准 5 段（分 时 日 月 周）。",
      },
    ],
    options: [
      {
        key: "count",
        label: "生成次数",
        type: "number",
        defaultValue: 5,
        min: 1,
        max: 20,
        step: 1,
      },
    ],
    features: { ...baseFeatures, hasSwap: false },
    example: {
      inputs: {
        expression: "0 */5 * * *",
      },
      options: {
        count: 5,
      },
    },
    outputFileExtension: "txt",
    outputMimeType: "text/plain;charset=utf-8",
  },
  {
    id: "json-diff",
    name: "JSON Diff",
    description: "比较两个 JSON 的差异，便于排查变更。",
    category: "dev",
    icon: DataAnalysis,
    keywords: ["json", "diff", "compare", "差异"],
    inputs: [
      {
        key: "left",
        label: "基准 JSON",
        type: "textarea",
        rows: 10,
        monospace: true,
        placeholder: '{"name":"A","count":1}',
      },
      {
        key: "right",
        label: "对比 JSON",
        type: "textarea",
        rows: 10,
        monospace: true,
        placeholder: '{"name":"B","count":2}',
      },
    ],
    options: [],
    features: { ...baseFeatures, multiInput: true },
    example: {
      inputs: {
        left: '{"name":"MyBlog","version":1,"tags":["a","b"]}',
        right: '{"name":"MyBlog","version":2,"tags":["a","c"],"dev":true}',
      },
    },
    outputFileExtension: "txt",
    outputMimeType: "text/plain;charset=utf-8",
    inputLimitBytes: ONE_MB,
  },
];

export const TOOL_CATEGORIES: ToolCategoryMeta[] = [
  {
    id: "encoding",
    name: "编解码",
    description: "常用编码与转义工具。",
    icon: Connection,
    order: 1,
    tools: encodingTools,
  },
  {
    id: "formatter",
    name: "格式化",
    description: "JSON、SQL、XML 等文本格式整理。",
    icon: Operation,
    order: 2,
    tools: formatterTools,
  },
  {
    id: "crypto",
    name: "哈希与加密",
    description: "MD5、SHA 与时间戳转换工具。",
    icon: Lock,
    order: 3,
    tools: cryptoTools,
  },
  {
    id: "text",
    name: "文本处理",
    description: "正则、统计、大小写转换等常用能力。",
    icon: Document,
    order: 4,
    tools: textTools,
  },
  {
    id: "color",
    name: "颜色工具",
    description: "颜色值转换与可视化取色。",
    icon: Brush,
    order: 5,
    tools: colorTools,
  },
  {
    id: "dev",
    name: "开发辅助",
    description: "JWT、二维码、密码、Cron、JSON Diff 等开发常用工具。",
    icon: SetUp,
    order: 6,
    tools: devTools,
  },
];

export const TOOL_LIST = TOOL_CATEGORIES.flatMap((category) => category.tools);

// 旧工具 id → 合并后的新工具 id（避免旧链接直接 404）
const LEGACY_TOOL_REDIRECT: Record<string, string> = {
  "json-minify": "json",
  "color-convert": "color",
  "color-picker": "color",
};

export const getToolByRoute = (categoryId: string, toolId: string) => {
  // 旧 id 重定向到合并后的工具
  const normalizedId = LEGACY_TOOL_REDIRECT[toolId] ?? toolId;
  return (
    TOOL_LIST.find(
      (item) => item.category === categoryId && item.id === normalizedId,
    ) ?? null
  );
};

export const getCategoryById = (categoryId: string) => {
  return TOOL_CATEGORIES.find((item) => item.id === categoryId) ?? null;
};

export const getToolPath = (tool: ToolMeta) => {
  return createPath(tool.category, tool.id);
};

export const buildDefaultToolInputs = (tool: ToolMeta): ToolInputValues => {
  return Object.fromEntries(
    tool.inputs.map((input) => [
      input.key,
      tool.example.inputs[input.key] ?? "",
    ]),
  );
};

export const buildDefaultToolOptions = (tool: ToolMeta): ToolOptionValues => {
  return Object.fromEntries(
    tool.options.map((option) => [option.key, option.defaultValue]),
  );
};
