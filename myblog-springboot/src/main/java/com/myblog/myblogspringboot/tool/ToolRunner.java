package com.myblog.myblogspringboot.tool;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Spring 侧运维工具的统一入口（方案 A：profile 驱动的 CLI Runner）。
 *
 * <p>用法（`tool` profile 下不起 Web 容器，不占端口）：
 * <pre>
 *   java -jar target/myblog-springboot-0.0.1-SNAPSHOT.jar --spring.profiles.active=tool --tool=audit
 *   java -jar target/myblog-springboot-0.0.1-SNAPSHOT.jar --spring.profiles.active=tool --tool=verify-uploads --strict
 *   java -jar target/myblog-springboot-0.0.1-SNAPSHOT.jar --spring.profiles.active=tool --tool=sync-meili --rebuild
 *   java -jar target/myblog-springboot-0.0.1-SNAPSHOT.jar --spring.profiles.active=tool --tool=regenerate-thumbs
 * </pre>
 *
 * <p>与 Express 侧 `myblog-express/scripts/` 的分工：那边是「后端无关的 Node 脚本」，
 * 这边是「与 Spring 部署同环境、复用同一组依赖与配置」的对应实现。两边都只连
 * 同一份 MySQL / Redis / Meili，因此跑哪一侧结论都应当一致。
 */
@Component
@Profile("tool")
public class ToolRunner implements ApplicationRunner {

    /** 用法错误（未指定 / 未知工具）时的退出码，与「工具自身失败（1）」区分开 */
    private static final int EXIT_USAGE = 2;

    private static final DateTimeFormatter TIME_TEXT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final List<OpsTool> tools;
    private final ConfigurableApplicationContext context;

    public ToolRunner(List<OpsTool> tools, ConfigurableApplicationContext context) {
        this.tools = tools.stream().sorted(Comparator.comparing(OpsTool::id)).toList();
        this.context = context;
    }

    /** 抬头用的时间文本（本地墙钟，仅用于人看） */
    public static String nowText() {
        return LocalDateTime.now().format(TIME_TEXT);
    }

    @Override
    public void run(ApplicationArguments args) {
        ToolOptions options = ToolOptions.parse(args.getSourceArgs());
        String requested = options.get("tool");

        if (requested == null || requested.isBlank() || "list".equalsIgnoreCase(requested)) {
            printHelp(requested == null || requested.isBlank());
            shutdown(requested == null || requested.isBlank() ? EXIT_USAGE : 0);
            return;
        }

        OpsTool tool = tools.stream()
                .filter(t -> t.id().equalsIgnoreCase(requested.trim()))
                .findFirst()
                .orElse(null);
        if (tool == null) {
            System.err.println("✗ 未知工具：--tool=" + requested);
            System.err.println();
            printHelp(true);
            shutdown(EXIT_USAGE);
            return;
        }

        int code;
        try {
            code = tool.run(options);
        } catch (Exception e) {
            System.err.println();
            System.err.println("✗ 工具执行失败：" + e.getClass().getSimpleName() + ": " + e.getMessage());
            code = 1;
        }
        shutdown(code);
    }

    private void printHelp(boolean isError) {
        System.out.println(ToolReport.repeat("=", 64));
        System.out.println(isError ? " Spring 侧运维工具（未选择工具 / 选择无效）" : " Spring 侧运维工具");
        System.out.println(ToolReport.repeat("=", 64));
        System.out.println();
        System.out.println("用法：");
        System.out.println("  java -jar target/myblog-springboot-0.0.1-SNAPSHOT.jar "
                + "--spring.profiles.active=tool --tool=<id> [选项]");
        System.out.println();
        System.out.println("可用工具：");
        for (OpsTool tool : tools) {
            System.out.println("  " + padRight(tool.id(), 20) + tool.title());
        }
        System.out.println();
        System.out.println("通用选项：");
        System.out.println("  --strict      发现问题时以退出码 1 结束（可用于 CI）");
        System.out.println("  --path=<dir>  覆盖 uploads 根目录（默认取 app.upload.path）");
        System.out.println("  --rebuild     仅 sync-meili：先删除索引再全量重建");
        System.out.println();
        System.out.println("说明：只有 audit / verify-uploads 是只读的；sync-meili 会写索引，");
        System.out.println("      regenerate-thumbs 会写 uploads 目录下的 .webp 变体。");
        System.out.println("      这些工具与 Express 侧 myblog-express/scripts/ 下的同名脚本等价。");
    }

    private static String padRight(String value, int width) {
        if (value.length() >= width) {
            return value + " ";
        }
        return value + " ".repeat(width - value.length());
    }

    /**
     * 优雅关闭后带退出码结束进程。
     *
     * <p>用 {@link SpringApplication#exit} 而不是直接 `System.exit`：它会先关闭上下文
     * （Hikari / Lettuce / JPA 都能正常释放），再返回退出码。
     */
    private void shutdown(int code) {
        int exitCode = code;
        try {
            exitCode = SpringApplication.exit(context, () -> code);
        } catch (Exception ignored) {
            // 上下文已关闭等异常：仍按原定退出码结束，不要把它变成「假成功」
        }
        System.exit(exitCode);
    }
}
