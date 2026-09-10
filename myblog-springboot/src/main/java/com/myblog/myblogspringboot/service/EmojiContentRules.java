package com.myblog.myblogspringboot.service;

import java.util.regex.Pattern;

import com.myblog.myblogspringboot.exception.BusinessException;

/**
 * 表情内容 / 分组标识 共用校验（与 Express utils/emojiValidation.js 规则一致）。
 *
 * 上轮回归教训：只给表情内容加校验、漏了分组标识，导致 javascript: 被成功建组。
 * 因此表情内容与分组标识必须调用同一个方法。
 */
public final class EmojiContentRules {

    /** 图片 URL 白名单（仅 http/https，无引号/尖括号/空白） */
    private static final Pattern URL_PATTERN =
            Pattern.compile("^https?://[^\\s\"'<>\\\\]+$", Pattern.CASE_INSENSITIVE);

    /** 危险 HTML 字符（防 XSS） */
    private static final Pattern UNSAFE_CHARS = Pattern.compile("[<>\"'`]");

    private EmojiContentRules() {}

    public static boolean isHttpUrl(String value) {
        return value != null && URL_PATTERN.matcher(value.trim()).matches();
    }

    /**
     * 校验「文本或图片 URL」类字段；不合法直接抛 BusinessException(400)。
     *
     * @param value     待校验内容
     * @param label     字段名（用于错误提示）
     * @param maxLength 最大长度
     */
    public static void validateTextOrImageUrl(String value, String label, int maxLength) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(400, label + "不能为空");
        }
        String trimmed = value.trim();
        if (trimmed.length() > maxLength) {
            throw new BusinessException(400, label + "过长（≤" + maxLength + " 字符）");
        }
        // 形似协议/URL（含 : / .）必须是 http(s)；纯文本禁 HTML 危险字符
        if (trimmed.contains(":") || trimmed.contains("/") || trimmed.contains(".")) {
            if (!isHttpUrl(trimmed)) {
                throw new BusinessException(400, "图片 URL 格式不正确（仅支持 http/https）");
            }
            return;
        }
        if (UNSAFE_CHARS.matcher(trimmed).find()) {
            throw new BusinessException(400, label + "包含非法字符（不允许 HTML 标记字符）");
        }
    }

    /** 依据内容自动判定表情类型：http(s) URL → image，否则回退到传入类型 */
    public static String resolveEmojiType(String content, String type) {
        if (isHttpUrl(content)) {
            return "image";
        }
        return (type == null || type.isBlank()) ? "emoji" : type;
    }
}
