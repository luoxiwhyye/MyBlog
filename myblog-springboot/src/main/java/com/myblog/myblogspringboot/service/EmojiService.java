package com.myblog.myblogspringboot.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.entity.Emoji;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.EmojiRepository;

import jakarta.persistence.criteria.Predicate;

@Service
public class EmojiService {

    private final EmojiRepository emojiRepository;

    public EmojiService(EmojiRepository emojiRepository) {
        this.emojiRepository = emojiRepository;
    }

    // 图片 URL 白名单（仅 http/https，无引号/尖括号/空白）
    private static final Pattern URL_PATTERN =
            Pattern.compile("^https?://[^\\s\"'<>\\\\]+$", Pattern.CASE_INSENSITIVE);
    // 危险 HTML 字符（防 XSS）
    private static final Pattern UNSAFE_CHARS = Pattern.compile("[<>\"'`]");

    private void validateContent(String content) {
        if (content == null || content.isBlank()) {
            throw new BusinessException(400, "表情内容不能为空");
        }
        String trimmed = content.trim();
        if (trimmed.length() > 500) {
            throw new BusinessException(400, "表情内容过长（≤500 字符）");
        }
        // 形似协议/URL（含 : / .）必须是 http/https；纯文本禁 HTML 危险字符
        if (trimmed.contains(":") || trimmed.contains("/") || trimmed.contains(".")) {
            if (!URL_PATTERN.matcher(trimmed).matches()) {
                throw new BusinessException(400, "图片 URL 格式不正确（仅支持 http/https）");
            }
            return;
        }
        if (UNSAFE_CHARS.matcher(trimmed).find()) {
            throw new BusinessException(400, "表情内容包含非法字符（不允许 HTML 标记字符）");
        }
    }

    public PageResponse<Map<String, Object>> getEmojis(int page, int pageSize,
                                                        String type, Boolean enabled,
                                                        boolean isAdmin) {
        Pageable pageable = PageRequest.of(page - 1, pageSize,
                Sort.by(Sort.Direction.ASC, "sortOrder").and(Sort.by(Sort.Direction.ASC, "id")));

        Specification<Emoji> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (type != null && !type.isBlank()) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (!isAdmin) {
                predicates.add(cb.equal(root.get("enabled"), 1));
            } else if (enabled != null) {
                predicates.add(cb.equal(root.get("enabled"), enabled ? 1 : 0));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };

        Page<Emoji> emojiPage = emojiRepository.findAll(spec, pageable);
        List<Map<String, Object>> list = emojiPage.getContent().stream()
                .map(this::toMap).toList();
        return new PageResponse<>(list, emojiPage.getTotalElements(), page, pageSize);
    }

    /** 公开：所有启用表情 */
    public List<Map<String, Object>> getEnabledEmojis() {
        List<Emoji> emojis = emojiRepository.findByEnabledOrderBySortOrderAscIdAsc(1);
        return emojis.stream().map(this::toMap).toList();
    }

    @Transactional
    public Map<String, Object> createEmoji(String content, String type,
                                           Boolean isCustom, Boolean enabled, Integer sortOrder) {
        validateContent(content);
        if (type != null && !List.of("emoji", "kaomoji").contains(type)) {
            throw new BusinessException(400, "type 必须是 emoji 或 kaomoji");
        }

        Emoji emoji = new Emoji();
        emoji.setContent(content.trim());
        emoji.setType(type != null ? type : "emoji");
        emoji.setIsCustom(Boolean.TRUE.equals(isCustom) ? 1 : 0);
        emoji.setEnabled(Boolean.FALSE.equals(enabled) ? 0 : 1);
        emoji.setSortOrder(sortOrder != null ? sortOrder : 0);
        Emoji saved = emojiRepository.save(emoji);
        return Map.of("id", saved.getId());
    }

    @Transactional
    public void updateEmoji(Integer id, String content, String type,
                            Boolean isCustom, Boolean enabled, Integer sortOrder) {
        Emoji emoji = emojiRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "表情不存在"));

        if (content != null) {
            validateContent(content);
            emoji.setContent(content.trim());
        }
        if (type != null) {
            if (!List.of("emoji", "kaomoji").contains(type)) {
                throw new BusinessException(400, "type 必须是 emoji 或 kaomoji");
            }
            emoji.setType(type);
        }
        if (isCustom != null) {
            emoji.setIsCustom(isCustom ? 1 : 0);
        }
        if (enabled != null) {
            emoji.setEnabled(enabled ? 1 : 0);
        }
        if (sortOrder != null) {
            emoji.setSortOrder(sortOrder);
        }
        emojiRepository.save(emoji);
    }

    @Transactional
    public void deleteEmoji(Integer id) {
        emojiRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "表情不存在"));
        emojiRepository.deleteById(id);
    }

    private Map<String, Object> toMap(Emoji emoji) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", emoji.getId());
        map.put("content", emoji.getContent());
        map.put("type", emoji.getType());
        map.put("isCustom", emoji.getIsCustom());
        map.put("enabled", emoji.getEnabled());
        map.put("sortOrder", emoji.getSortOrder());
        map.put("createdAt", emoji.getCreatedAt());
        return map;
    }
}
