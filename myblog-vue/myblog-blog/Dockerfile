# ============================================================
# myblog-blog (Nuxt 3 SSR) Dockerfile
# 博客前台 - 服务端渲染
# ============================================================

# ── 阶段一：构建 ──
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Nuxt 构建（ARG 注入构建时环境变量）
ARG NUXT_API_BASE=http://myblog-backend:3000/api/v1
ARG NUXT_SITE_URL=http://localhost:3001
ENV NUXT_API_BASE=${NUXT_API_BASE}
ENV NUXT_SITE_URL=${NUXT_SITE_URL}

RUN npm run build

# ── 阶段二：运行 ──
FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache dumb-init

# 只复制运行时需要的文件
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# 非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3001

ENV HOST=0.0.0.0

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", ".output/server/index.mjs"]
