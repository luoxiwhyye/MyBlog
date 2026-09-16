package com.myblog.myblogspringboot.tool;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 运维工具的命令行参数（`--key=value` 与 `--flag`）。
 *
 * <p>与 Express 脚本的开关一一对应，但改用显式参数而不是环境变量 ——
 * CLI 工具跑一次就退，参数写在命令行比 `STRICT=1` 更难用错：
 * <pre>
 *   --strict               等价 EXPRESS 的 STRICT=1（有问题时退出码 1）
 *   --rebuild              等价 syncMeili 的 REBUILD=1（先删索引再回填）
 *   --path=&lt;dir&gt;           覆盖 uploads 根目录（默认取 app.upload.path）
 *   --tool=&lt;id&gt;            选择要跑的工具（由 ToolRunner 解析）
 * </pre>
 */
public class ToolOptions {

    private final Map<String, String> values;

    private ToolOptions(Map<String, String> values) {
        this.values = values;
    }

    /**
     * 解析原始参数。支持三种写法：
     * {@code --key=value}（推荐）、{@code --key value}（空格分隔）、{@code --flag}（等价 {@code --flag=true}）。
     */
    public static ToolOptions parse(String[] args) {
        Map<String, String> map = new LinkedHashMap<>();
        for (int i = 0; i < args.length; i++) {
            String arg = args[i];
            if (arg == null || !arg.startsWith("--")) {
                continue;
            }
            String body = arg.substring(2);
            int eq = body.indexOf('=');
            if (eq >= 0) {
                map.put(body.substring(0, eq), body.substring(eq + 1));
            } else if (i + 1 < args.length && args[i + 1] != null && !args[i + 1].startsWith("--")) {
                // `--key value` 形式：吃掉下一个参数
                map.put(body, args[++i]);
            } else {
                map.put(body, "true");
            }
        }
        return new ToolOptions(map);
    }

    public String get(String key) {
        return values.get(key);
    }

    public String get(String key, String defaultValue) {
        String value = values.get(key);
        return value == null || value.isBlank() ? defaultValue : value;
    }

    /** 开关：出现即真；`--flag=false` / `--flag=0` 视为假 */
    public boolean flag(String key) {
        String value = values.get(key);
        if (value == null) {
            return false;
        }
        return !("false".equalsIgnoreCase(value) || "0".equals(value));
    }

    public Map<String, String> asMap() {
        return Map.copyOf(values);
    }
}
