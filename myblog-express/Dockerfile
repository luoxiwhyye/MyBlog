# ============================================================
# myblog-express Dockerfile
# Node.js Express 后端服务
# ============================================================
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --production --ignore-scripts

FROM node:22-alpine
WORKDIR /app

# 安装 dumb-init 用于优雅关闭
RUN apk add --no-cache dumb-init

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

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
