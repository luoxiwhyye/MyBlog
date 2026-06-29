# ============================================================
# myblog-springboot Dockerfile
# Spring Boot 后端服务（多阶段构建）
# ============================================================

# ── 阶段一：构建 JAR ──
FROM maven:3.9-eclipse-temurin-17-alpine AS builder
WORKDIR /build
COPY pom.xml .
COPY mvnw .
COPY .mvn .mvn
# 下载依赖（利用 Docker 缓存层）
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# ── 阶段二：运行镜像 ──
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# 安装 dumb-init
RUN apk add --no-cache dumb-init

# 创建上传目录
RUN mkdir -p uploads/article/cover uploads/blogger/avatar uploads/setting/image

# 从构建阶段复制 JAR
COPY --from=builder /build/target/*.jar app.jar

# 非 root 用户
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["java", "-jar", "app.jar"]
