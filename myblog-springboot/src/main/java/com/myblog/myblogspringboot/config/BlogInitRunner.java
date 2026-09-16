package com.myblog.myblogspringboot.config;

import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.myblog.myblogspringboot.entity.Blogger;
import com.myblog.myblogspringboot.repository.BloggerRepository;

@Component
public class BlogInitRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(BlogInitRunner.class);

    private final BloggerRepository bloggerRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

    @Value("${app.blogger.username:admin}")
    private String defaultUsername;

    @Value("${app.blogger.password:admin123}")
    private String defaultPassword;

    @Value("${app.blogger.nickname:博主}")
    private String defaultNickname;

    @Value("${app.blogger.email:admin@blog.com}")
    private String defaultEmail;

    public BlogInitRunner(BloggerRepository bloggerRepository, PasswordEncoder passwordEncoder,
                          Environment environment) {
        this.bloggerRepository = bloggerRepository;
        this.passwordEncoder = passwordEncoder;
        this.environment = environment;
    }

    @Override
    public void run(String... args) {
        // tool profile（运维工具）下不做任何初始化写入：
        // audit / verify-uploads 声称「只读」，若启动时顺手建了账号，这句话就不成立了。
        if (environment.acceptsProfiles(Profiles.of("tool"))) {
            log.info("ℹ️  tool 模式：跳过博主初始化");
            return;
        }

        // ── 生产环境安全检查：禁止使用默认密码 ──
        String activeProfile = System.getProperty("spring.profiles.active", "");
        if ("production".equalsIgnoreCase(activeProfile)
                && "admin123".equals(defaultPassword)) {
            log.error("❌ 安全错误：生产环境禁止使用默认博主密码。请设置 BLOGGER_PASSWORD 环境变量。");
            throw new IllegalStateException(
                    "生产环境不允许使用默认博主密码，请通过 BLOGGER_PASSWORD 环境变量设置"
            );
        }

        if (bloggerRepository.findByUsername(defaultUsername).isEmpty()) {
            Blogger blogger = new Blogger();
            blogger.setUsername(defaultUsername);
            blogger.setNickname(defaultNickname);
            blogger.setPasswordHash(passwordEncoder.encode(defaultPassword));
            blogger.setEmail(defaultEmail);
            blogger.setRole("admin");
            blogger.setCreatedAt(LocalDateTime.now());

            bloggerRepository.save(blogger);

            log.info("✅ 博主初始化成功");
            log.info("📝 账号: {}", defaultUsername);
            log.info("⚠️  请及时登录后台修改默认密码！");
        } else {
            log.info("✅ 博主账号已存在，跳过初始化");
        }
    }
}
