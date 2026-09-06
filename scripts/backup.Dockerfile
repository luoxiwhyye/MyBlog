# ============================================================
# myblog-backup — 定时数据库备份容器
# 基于 Alpine + mariadb-client + crond，调用 scripts/backup.sh
# 备份文件挂载到 /backups，同时生成 .sha256 校验和
# ============================================================

FROM alpine:3.20

RUN apk add --no-cache \
    bash \
    mariadb-client \
    gzip \
    coreutils \
    tzdata \
    curl

# 时区（默认 Asia/Shanghai，可用 TZ 环境变量覆盖）
ENV TZ=Asia/Shanghai

# 拷贝备份 / 校验 / 恢复脚本
COPY backup.sh /scripts/backup.sh
COPY verify-backup.sh /scripts/verify-backup.sh
COPY restore.sh /scripts/restore.sh

RUN chmod +x /scripts/*.sh && mkdir -p /backups /var/log

# crond 前台运行
CMD ["crond", "-f", "-l", "8"]
