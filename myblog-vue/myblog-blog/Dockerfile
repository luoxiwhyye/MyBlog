# ============================================================
# myblog-blog (Nuxt 3 SSR) Dockerfile
# 博客前台 - 服务端渲染
# ============================================================

# ── 阶段一：构建 ──
FROM node:22-alpine AS builder
WORKDIR /app

# Alpine（musl）上编译原生模块所需工具链。
# sharp(@nuxt/image→ipx)、@parcel/watcher(sass)、esbuild 等若预编译二进制
# 下载失败会回退到 node-gyp 源码编译，缺 python3/make/g++ 会让 npm install
# 直接 exit code 1；libc6-compat 兼容部分 glibc 依赖。
RUN apk add --no-cache python3 make g++ libc6-compat

# 先复制整个项目（.dockerignore 已排除 node_modules/.nuxt/.output 等），
# 再安装依赖。因为 postinstall=nuxt prepare 需要 nuxt.config 等源文件，
# 若只 COPY package.json 会在缺源码时执行 nuxt prepare 而失败。
COPY . .

RUN npm install

# Nuxt 构建（ARG 注入构建时环境变量）
ARG NUXT_API_BASE=http://myblog-backend:3000/api/v1
ARG NUXT_SITE_URL=http://localhost:3001
ENV NUXT_API_BASE=${NUXT_API_BASE}
ENV NUXT_SITE_URL=${NUXT_SITE_URL}

RUN npm run build

# ── 阶段二：运行 ──
FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache dumb-init curl

# Nuxt .output 已包含运行时全部依赖，无需复制 node_modules，显著减小镜像体积
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./

# 非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3001

ENV HOST=0.0.0.0

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3001/ || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", ".output/server/index.mjs"]
