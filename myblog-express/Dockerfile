# ============================================================
# myblog-express Dockerfile
# Node.js Express 后端服务
# 多阶段构建 + 非 root 用户 + 健康检查
# ============================================================

# ── 阶段一：安装依赖 ──
# 注意：不能使用 --ignore-scripts，否则 sharp 无法下载预编译二进制，
# 导致 WebP 图片转换静默失效。
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── 阶段二：运行 ──
FROM node:22-alpine
WORKDIR /app

# 安装 dumb-init 用于优雅关闭 + curl 用于健康检查
RUN apk add --no-cache dumb-init curl

# 从 builder 复制 node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# 创建上传目录
RUN mkdir -p uploads/article/cover uploads/blogger/avatar uploads/setting/image

# 安全设置：非 root 用户运行
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

# 健康检查：/health 端点（Docker Compose 与 k8s 探针共用）
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
