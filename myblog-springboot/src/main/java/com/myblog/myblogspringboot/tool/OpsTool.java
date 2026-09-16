package com.myblog.myblogspringboot.tool;

/**
 * 一个运维工具（Spring `tool` profile 下的 CLI 子命令）。
 *
 * <p>实现类都是 `@org.springframework.stereotype.Component` +
 * `@org.springframework.context.annotation.Profile("tool")`，由 {@link ToolRunner}
 * 按 {@link #id()} 分发。这样每个工具都能直接注入项目里已有的 bean
 * （`JdbcTemplate` / `MeilisearchService` / `UploadService`），不需要自己造连接。
 */
public interface OpsTool {

    /** 稳定标识，供 {@code --tool=<id>} 使用（kebab-case） */
    String id();

    /** 中文名，用于帮助输出与运行抬头 */
    String title();

    /**
     * 执行并返回进程退出码（0 = 正常）。
     *
     * <p>注意：本方法抛异常时由 {@link ToolRunner} 统一兜底成退出码 1，
     * 工具内部不需要为了「报个错」而 `System.exit`。
     */
    int run(ToolOptions options) throws Exception;
}
