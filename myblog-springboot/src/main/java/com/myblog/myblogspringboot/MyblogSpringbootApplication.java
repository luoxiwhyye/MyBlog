package com.myblog.myblogspringboot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MyblogSpringbootApplication {

	public static void main(String[] args) {
		SpringApplication application = new SpringApplication(MyblogSpringbootApplication.class);

		// tool 模式（运维工具）不起 Web 容器：不占端口、也不会与正在运行的实例抢资源。
		// 这样 `java -jar app.jar --spring.profiles.active=tool --tool=audit` 可以直接跑，
		// 不必再手写 --spring.main.web-application-type=none。
		if (isToolProfile(args)) {
			application.setWebApplicationType(WebApplicationType.NONE);
		}

		application.run(args);
	}

	/** 命令行或环境变量里是否激活了 tool profile */
	private static boolean isToolProfile(String[] args) {
		for (int i = 0; i < args.length; i++) {
			String arg = args[i];
			if (arg == null) {
				continue;
			}
			String prefix = "--spring.profiles.active=";
			if (arg.startsWith(prefix)) {
				if (containsTool(arg.substring(prefix.length()))) {
					return true;
				}
			} else if ("--spring.profiles.active".equals(arg) && i + 1 < args.length) {
				if (containsTool(args[i + 1])) {
					return true;
				}
			}
		}
		return containsTool(System.getenv("SPRING_PROFILES_ACTIVE"));
	}

	private static boolean containsTool(String profiles) {
		if (profiles == null || profiles.isBlank()) {
			return false;
		}
		for (String profile : profiles.split(",")) {
			if ("tool".equals(profile.trim())) {
				return true;
			}
		}
		return false;
	}
}
