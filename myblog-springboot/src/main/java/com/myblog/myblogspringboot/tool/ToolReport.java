package com.myblog.myblogspringboot.tool;

import java.util.ArrayList;
import java.util.List;

/**
 * 体检类工具的输出与发现收集。
 *
 * <p>对标 Express `scripts/auditData.js` / `verifyUploads.js` 的
 * `findings` / `section` / `printSince`：先按节收集发现，再只打印该节新增的项，
 * 最后统一汇总 —— 这样「每节打印」与「全局计数」可以并存而不互相污染。
 *
 * <p>级别约定（与 Express 侧一字不差）：
 * <ul>
 *   <li>{@code [error]} 数据已不自洽，需要处理（前台可能已经表现异常）</li>
 *   <li>{@code [warn ]} 可疑或残缺，建议确认</li>
 *   <li>{@code [info ]} 提示性信息，不一定是问题</li>
 * </ul>
 */
public class ToolReport {

    public enum Level { ERROR, WARN, INFO }

    /** 某一节的发现起点 */
    public record Snapshot(int error, int warn, int info) {}

    private record Finding(Level level, String title, List<String> details) {}

    /** 一节检查的执行体（允许抛受检异常，便于直接调 JdbcTemplate） */
    @FunctionalInterface
    public interface Section {
        void run() throws Exception;
    }

    private static final int MAX_DETAIL_LINES = 15;
    private static final String RULE = "─".repeat(64);

    private final List<Finding> findings = new ArrayList<>();

    public static String rule() {
        return RULE;
    }

    public static String repeat(String ch, int len) {
        return ch.repeat(len);
    }

    public void error(String title) {
        add(Level.ERROR, title, List.of());
    }

    public void error(String title, List<String> details) {
        add(Level.ERROR, title, details);
    }

    public void warn(String title) {
        add(Level.WARN, title, List.of());
    }

    public void warn(String title, List<String> details) {
        add(Level.WARN, title, details);
    }

    public void info(String title) {
        add(Level.INFO, title, List.of());
    }

    public void info(String title, List<String> details) {
        add(Level.INFO, title, details);
    }

    /** 有明细项时才报（把「先查 count 再查明细」两步合成一次，减少查询） */
    public void reportIfAny(Level level, String title, List<String> details) {
        add(level, title, details);
    }

    private void add(Level level, String title, List<String> details) {
        findings.add(new Finding(level, title, details == null ? List.of() : details));
    }

    public Snapshot snapshot() {
        return new Snapshot(count(Level.ERROR), count(Level.WARN), count(Level.INFO));
    }

    public int count(Level level) {
        return (int) findings.stream().filter(f -> f.level() == level).count();
    }

    /** 某级别的全部标题（用于汇总结论里复述需要处理的问题） */
    public List<String> titles(Level level) {
        return findings.stream()
                .filter(f -> f.level() == level)
                .map(Finding::title)
                .toList();
    }

    public void section(int index, String title) {
        System.out.println();
        System.out.println(RULE);
        System.out.println(index + "、" + title);
        System.out.println(RULE);
    }

    /** 跑一节检查并只打印该节的发现 */
    public void runSection(int index, String title, Section body) throws Exception {
        section(index, title);
        Snapshot snap = snapshot();
        body.run();
        printSince(snap);
    }

    public void printSince(Snapshot snap) {
        int printed = 0;

        for (Level level : List.of(Level.ERROR, Level.WARN, Level.INFO)) {
            String mark = markOf(level);
            int skip = switch (level) {
                case ERROR -> snap.error();
                case WARN -> snap.warn();
                case INFO -> snap.info();
            };

            int seen = 0;
            for (Finding f : findings) {
                if (f.level() != level) {
                    continue;
                }
                if (seen++ < skip) {
                    continue;
                }
                printed++;
                System.out.println("  " + mark + " " + f.title());
                List<String> details = f.details();
                int shownCount = Math.min(details.size(), MAX_DETAIL_LINES);
                for (int i = 0; i < shownCount; i++) {
                    System.out.println("      " + details.get(i));
                }
                if (details.size() > shownCount) {
                    System.out.println("      …（另有 " + (details.size() - shownCount) + " 条，已省略）");
                }
            }
        }

        if (printed == 0) {
            System.out.println("  ✓ 未发现问题");
        }
    }

    private String markOf(Level level) {
        return switch (level) {
            case ERROR -> "✗";
            case WARN -> "⚠";
            case INFO -> "·";
        };
    }
}
