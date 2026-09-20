# ============================================================
# myblog-backup — 定时备份容器
# 基于 Alpine + mariadb-client + rclone + crond，调用 scripts/backup*.sh
# 备份文件挂载到 /backups，同时生成 .sha256 校验和
#
# 两类备份都要有：backup.sh 备份数据库，backup-uploads.sh 备份上传目录
# （图片不在数据库里，丢了无法从库重建）。
# rclone 用于把备份同步到对象存储 —— 备份只留在本机 = 宿主机磁盘损坏即全丢。
#
# ⚠️ mariadb-connector-c 不能省：MySQL 8 默认用 caching_sha2_password 认证，
#    mariadb-client 单独安装时缺少该插件（/usr/lib/mariadb/plugin/caching_sha2_password.so），
#    mysqldump 会直接报「Plugin caching_sha2_password could not be loaded」→ 数据库备份永远失败。
# ============================================================

FROM alpine:3.20

# Alpine 软件源：默认官方源。中国大陆服务器可用 --build-arg APK_MIRROR=mirrors.tencent.com 加速
ARG APK_MIRROR=
RUN if [ -n "${APK_MIRROR}" ]; then \
      sed -i "s|dl-cdn.alpinelinux.org|${APK_MIRROR}|g" /etc/apk/repositories; \
    fi \
 && apk add --no-cache \
    bash \
    mariadb-client \
    mariadb-connector-c \
    gzip \
    coreutils \
    tzdata \
    curl \
    rclone

# 时区（默认 Asia/Shanghai，可用 TZ 环境变量覆盖）
ENV TZ=Asia/Shanghai

# 拷贝备份 / 校验 / 恢复 / 演练脚本
COPY backup.sh /scripts/backup.sh
COPY backup-uploads.sh /scripts/backup-uploads.sh
COPY verify-backup.sh /scripts/verify-backup.sh
COPY restore.sh /scripts/restore.sh
COPY rehearse-restore.sh /scripts/rehearse-restore.sh

RUN chmod +x /scripts/*.sh && mkdir -p /backups /var/log

# crond 前台运行
CMD ["crond", "-f", "-l", "8"]
