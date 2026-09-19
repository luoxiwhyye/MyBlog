# ============================================================
# myblog-admin Dockerfile (Vue 3 SPA + Nginx)
# 管理后台 - 多阶段构建，最终以 Nginx 提供静态文件
# ============================================================

# ── 阶段一：构建 SPA ──
FROM node:22-alpine AS builder
WORKDIR /app

# 必须把 package-lock.json 一起复制并用 npm ci：
# 只复制 package.json 时 npm install 会现场解析版本，镜像里的依赖与 CI / 本地
# 验证过的版本可能不同（同一个 commit 构不出同一个镜像）。
# npm 源：默认官方源。中国大陆服务器可用 --build-arg NPM_REGISTRY=https://registry.npmmirror.com 加速
ARG NPM_REGISTRY=https://registry.npmjs.org
COPY package.json package-lock.json ./
RUN npm config set registry "${NPM_REGISTRY}" && npm ci

COPY . .

# 构建时注入后端 API 地址
ARG VITE_API_BASE=http://myblog-backend:3000/api/v1
ENV VITE_API_BASE=${VITE_API_BASE}

RUN npm run build

# ── 阶段二：Nginx 提供静态文件 ──
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

# 复制构建产物
COPY --from=builder /app/dist ./

# 复制 Nginx 配置（SPA 路由支持）
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
