package com.myblog.myblogspringboot.config;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.myblog.myblogspringboot.tool.UploadPathSupport;

/**
 * 启动自检：uploads 目录能否对上数据库引用。
 *
 * <p>对标 Express `utils/uploadSelfCheck.js`（口径必须一致）。背景：图片地址
 * （`/uploads/xxx`）存在数据库里，文件却在各自的 uploads 目录里。两个后端各有一份
 * uploads 时（本机同时跑 Express 与 Spring 最容易撞到），接口一切正常、迁移也没报错，
 * 只有前台图片 404 —— 而日志里一行提示都没有。
 *
 * <p>因此这里把「解析到的根目录」打出来，并抽一条数据库引用核对文件在不在。
 * 只打印，不影响启动；`tool` profile（运维工具自带 `--path`）下跳过。
 */
@Component
public class UploadDirSelfCheck implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(UploadDirSelfCheck.class);

    /**
     * 抽样来源：任意一条能说明「数据库里有本地引用」的记录即可。
     * 表不存在（老库）等错误按「跳过该来源」处理。
     */
    private static final List<Sample> SAMPLES = List.of(
            new Sample("文章封面",
                    "SELECT cover_image AS value FROM article WHERE cover_image LIKE '%/uploads/%' ORDER BY id DESC LIMIT 1"),
            new Sample("博主头像",
                    "SELECT avatar AS value FROM blogger WHERE avatar LIKE '%/uploads/%' LIMIT 1"),
            new Sample("站点图片设置",
                    "SELECT setting_value AS value FROM setting WHERE setting_type = 'image' AND setting_value LIKE '%/uploads/%' LIMIT 1"),
            new Sample("友链头像",
                    "SELECT avatar AS value FROM friend_link WHERE avatar LIKE '%/uploads/%' LIMIT 1"));

    private final JdbcTemplate jdbc;
    private final Environment environment;

    @Value("${app.upload.path:uploads}")
    private String uploadPath;

    public UploadDirSelfCheck(JdbcTemplate jdbc, Environment environment) {
        this.jdbc = jdbc;
        this.environment = environment;
    }

    @Override
    public void run(String... args) {
        // tool 模式（audit / verify-uploads 等）自带 --path，自检会与它打架
        if (environment.acceptsProfiles(Profiles.of("tool"))) {
            return;
        }
        try {
            check();
        } catch (Exception e) {
            log.warn("[uploads] 目录自检失败（忽略）: {}", e.getMessage());
        }
    }

    /** 打印解析后的根目录，并核对一条数据库引用 */
    private void check() {
        Path root = Paths.get(uploadPath == null || uploadPath.isBlank() ? "uploads" : uploadPath)
                .toAbsolutePath().normalize();

        String howMany = Files.isDirectory(root) ? countFiles(root) + " 个文件" : "不存在";
        log.info("[uploads] 根目录: {}（{}）", root, howMany);

        Sample hit = null;
        String value = null;
        for (Sample sample : SAMPLES) {
            try {
                List<Map<String, Object>> rows = jdbc.queryForList(sample.sql());
                if (!rows.isEmpty() && rows.get(0).get("value") != null) {
                    Object raw = rows.get(0).get("value");
                    if (!String.valueOf(raw).isBlank()) {
                        hit = sample;
                        value = String.valueOf(raw);
                        break;
                    }
                }
            } catch (Exception e) {
                // 表 / 列不存在或查询失败：跳过该来源
            }
        }

        if (hit == null || value == null) {
            return;
        }

        String relative = UploadPathSupport.relativePathFromUrl(value);
        boolean found = !relative.isEmpty() && Files.exists(root.resolve(relative));
        if (!found) {
            log.warn(
                    """
                    [uploads] 数据库引用的图片在本目录里不存在（{}: {}）
                    [uploads]   当前根目录：{}
                    [uploads]   两个后端必须指向同一份 uploads —— 本机同时跑 Spring 时，
                    [uploads]   请把 UPLOAD_PATH 指向 ../myblog-express/uploads；
                    [uploads]   完整体检：--tool=verify-uploads（Express 侧为 node scripts/verifyUploads.js）""",
                    hit.source(), value, root);
        }
    }

    private long countFiles(Path dir) {
        long total = 0;
        try (var stream = Files.walk(dir)) {
            total = stream.filter(Files::isRegularFile).count();
        } catch (Exception e) {
            return 0;
        }
        return total;
    }

    /** 抽样来源（说明文字 + 查询语句） */
    private record Sample(String source, String sql) {
    }
}
