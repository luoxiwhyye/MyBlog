package com.myblog.myblogspringboot.config;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;

/**
 * 取客户端 IP 的<b>唯一实现</b>（对标 Express {@code utils/clientIp.js}）。
 *
 * <p>「客户端 IP」在本项目里有三个消费点：限流分桶（{@link RateLimitFilter}）、
 * 评论入库、留言入库。它们必须共用同一个实现，否则同一份部署下会出现
 * 「限流按 X-Forwarded-For、入库按 remoteAddr」这类自相矛盾的口径，
 * 直连暴露时伪造一个 XFF 头就能每次换桶绕过限流。
 *
 * <p>语义由 {@code TRUST_PROXY}（{@code app.trust-proxy}，默认 1）决定，
 * 与 Express 的 {@code app.set("trust proxy", ...)} 逐项对齐：
 * <ul>
 *   <li>{@code 0} —— 不信任任何转发头，取 socket 地址（直连部署）</li>
 *   <li>{@code n} —— 信任右起 n 跳代理：把 {@code X-Forwarded-For} 按「由近到远」
 *       拼到 remoteAddr 之后，取第 n 项。经 nginx / Nuxt 一层反代时 {@code n=1}
 *       得到真实访客 IP，而攻击者塞在 XFF 前缀里的伪造地址会被忽略。</li>
 * </ul>
 *
 * <p>⚠️ <b>只认 X-Forwarded-For，不认 X-Real-IP</b> —— 与 Express 的
 * {@code req.ip}（proxy-addr）一致。
 *
 * <p>⚠️ 不要改成 {@code server.forward-headers-strategy: native}：Tomcat 的
 * {@code RemoteIpValve} 会直接改写 {@code getRemoteAddr()}，信任层数由内网网段
 * 规则推断、不可配，与 Express 的「按层数信任」只是近似对齐；而本类自己算 XFF，
 * 两端语义可以逐项对上。
 */
@Component
public class ClientIpResolver {

    /** 信任的反向代理层数；0 = 不信任任何转发头 */
    private final int trustProxy;

    public ClientIpResolver(@Value("${app.trust-proxy:1}") int trustProxy) {
        this.trustProxy = trustProxy;
    }

    /**
     * 取客户端 IP（取不到返回空串，与 Express 同）。
     *
     * <p>实现即「由近到远的地址列表里第 {@code trustProxy} 项」：
     * 列表 = [remoteAddr] + reverse(XFF)。{@code trustProxy=0} 时取第 0 项
     * （= remoteAddr），索引越界时退化为最后一项。
     */
    public String resolve(HttpServletRequest request) {
        if (request == null) {
            return "";
        }

        List<String> addresses = new ArrayList<>();
        addresses.add(normalize(request.getRemoteAddr()));

        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            String[] hops = forwardedFor.split(",");
            // XFF 是「最早 → 最近」，从右往左读才对应「由近到远」
            for (int i = hops.length - 1; i >= 0; i--) {
                String hop = normalize(hops[i]);
                if (!hop.isEmpty()) {
                    addresses.add(hop);
                }
            }
        }

        int index = trustProxy <= 0 ? 0 : Math.min(trustProxy, addresses.size() - 1);
        return addresses.get(index);
    }

    /**
     * 归一化 IP 字面量：去掉 IPv4-mapped IPv6 前缀。
     *
     * <p>Node 的 socket 地址对 IPv4 访客返回 {@code ::ffff:127.0.0.1}，而转发头里
     * 写的是 {@code 127.0.0.1}；不归一化会让「直连」与「经反代」两种情形入库两种
     * 写法，也会与 Express 侧对不上。
     */
    private static String normalize(String value) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.regionMatches(true, 0, "::ffff:", 0, 7)) {
            return trimmed.substring(7);
        }
        return trimmed;
    }
}
