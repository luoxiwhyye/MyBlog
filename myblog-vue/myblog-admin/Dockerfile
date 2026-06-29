# ============================================================
# myblog-admin Dockerfile (Vue 3 SPA + Nginx)
# 管理后台 - 多阶段构建，最终以 Nginx 提供静态文件
# ============================================================

# ── 阶段一：构建 SPA ──
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

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
