package com.myblog.myblogspringboot.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.support.PropertiesLoaderUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Properties;

/**
 * 让 Spring Boot 在启动时自动加载项目根目录的 .env 文件。
 *
 * 加载优先级（低 → 高）：
 *   1. .env.example（模板，不覆盖已有值）
 *   2. .env（实际配置，覆盖 .env.example 中的同名变量）
 *   3. 操作系统环境变量（最终生效，最高优先级）
 *
 * 这样 `application.yml` 中的 ${DB_PASSWORD:} 就能读到了。
 *
 * 注册方式：META-INF/spring.factories
 */
public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final Logger log = LoggerFactory.getLogger(DotenvEnvironmentPostProcessor.class);

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment,
                                        SpringApplication application) {
        // 从工作目录定位 .env 文件
        Path projectRoot = Paths.get("").toAbsolutePath();

        Map<String, Object> dotenvProperties = new LinkedHashMap<>();

        // 1) 先加载 .env.example（低优先级）
        loadDotenvFile(projectRoot.resolve(".env.example"), dotenvProperties, false);

        // 2) 再加载 .env（覆盖同名变量）
        loadDotenvFile(projectRoot.resolve(".env"), dotenvProperties, true);

        if (!dotenvProperties.isEmpty()) {
            MutablePropertySources propertySources = environment.getPropertySources();
            // 插入到末尾（环境变量 / 命令行参数优先级更高）
            propertySources.addLast(new MapPropertySource("dotenv", dotenvProperties));
            log.info("✅ 已从 .env 加载 {} 个配置项", dotenvProperties.size());
        }
    }

    private void loadDotenvFile(Path filePath, Map<String, Object> target, boolean override) {
        if (!Files.isRegularFile(filePath)) {
            return;
        }

        try {
            Properties props = new Properties();
            props.load(Files.newBufferedReader(filePath));

            for (String key : props.stringPropertyNames()) {
                String value = props.getProperty(key);
                if (value == null) continue;

                // 跳过注释行和空值
                if (key.startsWith("#")) continue;
                if (value.isEmpty()) continue;

                if (override || !target.containsKey(key)) {
                    target.put(key, value);
                }
            }
        } catch (IOException e) {
            log.warn("⚠️ 无法读取 {}: {}", filePath.getFileName(), e.getMessage());
        }
    }
}
