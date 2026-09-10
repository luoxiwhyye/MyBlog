package com.myblog.myblogspringboot.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.entity.Emoji;
import com.myblog.myblogspringboot.entity.EmojiGroup;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.EmojiGroupRepository;
import com.myblog.myblogspringboot.repository.EmojiRepository;

import jakarta.persistence.criteria.Predicate;

@Service
public class EmojiService {

    /** 表情类型枚举（A：新增 image） */
    private static final List<String> EMOJI_TYPES = List.of("emoji", "kaomoji", "image");

    private final EmojiRepository emojiRepository;
    private final EmojiGroupRepository emojiGroupRepository;

    public EmojiService(EmojiRepository emojiRepository,
                        EmojiGroupRepository emojiGroupRepository) {
        this.emojiRepository = emojiRepository;
        this.emojiGroupRepository = emojiGroupRepository;
    }

    public PageResponse<Map<String, Object>> getEmojis(int page, int pageSize,
                                                        String type, Boolean enabled,
                                                        String groupId, boolean isAdmin) {
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
            // 分组筛选（仅管理端）：0/none/null=未分组，正整数=指定分组
            if (isAdmin && groupId != null && !groupId.isBlank()) {
                String raw = groupId.trim().toLowerCase();
                if ("0".equals(raw) || "none".equals(raw) || "null".equals(raw)
                        || "default".equals(raw)) {
                    predicates.add(cb.isNull(root.get("groupId")));
                } else {
                    try {
                        predicates.add(cb.equal(root.get("groupId"), Integer.parseInt(raw)));
                    } catch (NumberFormatException ignored) {
                        // 非法值视为不过滤
                    }
                }
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };

        Page<Emoji> emojiPage = emojiRepository.findAll(spec, pageable);
        List<Map<String, Object>> list = emojiPage.getContent().stream()
                .map(this::toMapWithGroup).toList();
        return new PageResponse<>(list, emojiPage.getTotalElements(), page, pageSize);
    }

    /** 公开：所有启用表情 */
    public List<Map<String, Object>> getEnabledEmojis() {
        List<Emoji> emojis = emojiRepository.findByEnabledOrderBySortOrderAscIdAsc(1);
        return emojis.stream().map(this::toMap).toList();
    }

    /**
     * 公开：按分组返回启用表情（前台表情面板）。
     * 未归属分组的表情归入「默认」分组（id=0）。
     */
    public List<Map<String, Object>> getGroupedEmojis() {
        List<EmojiGroup> groups = emojiGroupRepository.findAllByOrderBySortOrderAscIdAsc();
        List<Emoji> emojis = emojiRepository.findByEnabledOrderBySortOrderAscIdAsc(1);

        Map<Integer, Map<String, Object>> groupMap = new LinkedHashMap<>();
        List<Map<String, Object>> result = new ArrayList<>();
        for (EmojiGroup group : groups) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", group.getId());
            map.put("name", group.getName());
            map.put("cover", group.getCover());
            map.put("sortOrder", group.getSortOrder());
            map.put("emojis", new ArrayList<Map<String, Object>>());
            groupMap.put(group.getId(), map);
            result.add(map);
        }

        Map<String, Object> defaultGroup = null;
        for (Emoji emoji : emojis) {
            Map<String, Object> bucket = null;
            if (emoji.getGroupId() != null) {
                bucket = groupMap.get(emoji.getGroupId());
            }
            if (bucket == null) {
                if (defaultGroup == null) {
                    defaultGroup = new LinkedHashMap<>();
                    defaultGroup.put("id", 0);
                    defaultGroup.put("name", "默认");
                    defaultGroup.put("cover", "");
                    defaultGroup.put("sortOrder", Integer.MAX_VALUE);
                    defaultGroup.put("emojis", new ArrayList<Map<String, Object>>());
                    result.add(defaultGroup);
                }
                bucket = defaultGroup;
            }
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> bucketEmojis =
                    (List<Map<String, Object>>) bucket.get("emojis");
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", emoji.getId());
            item.put("content", emoji.getContent());
            item.put("type", emoji.getType());
            bucketEmojis.add(item);
        }

        // 过滤掉无表情的空分组
        for (int i = result.size() - 1; i >= 0; i--) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> bucketEmojis =
                    (List<Map<String, Object>>) result.get(i).get("emojis");
            if (bucketEmojis.isEmpty()) {
                result.remove(i);
            }
        }
        return result;
    }

    @Transactional
    public Map<String, Object> createEmoji(String content, String type, Integer groupId,
                                           Boolean isCustom, Boolean enabled, Integer sortOrder) {
        EmojiContentRules.validateTextOrImageUrl(content, "表情内容", 500);
        String normalizedType = normalizeType(content, type);
        Integer normalizedGroupId = resolveGroupId(groupId);

        Emoji emoji = new Emoji();
        emoji.setContent(content.trim());
        emoji.setType(normalizedType);
        emoji.setGroupId(normalizedGroupId);
        emoji.setIsCustom(Boolean.TRUE.equals(isCustom) ? 1 : 0);
        emoji.setEnabled(Boolean.FALSE.equals(enabled) ? 0 : 1);
        emoji.setSortOrder(sortOrder != null ? sortOrder : 0);
        Emoji saved = emojiRepository.save(emoji);
        return Map.of("id", saved.getId());
    }

    /**
     * @param groupIdProvided 是否在请求里带了 groupId（区分「未传=不动」与「传 null=移出分组」）
     */
    @Transactional
    public void updateEmoji(Integer id, String content, String type,
                            Boolean isCustom, Boolean enabled, Integer sortOrder,
                            Integer groupId, boolean groupIdProvided) {
        Emoji emoji = emojiRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "表情不存在"));

        if (content != null) {
            EmojiContentRules.validateTextOrImageUrl(content, "表情内容", 500);
            emoji.setContent(content.trim());
        }
        if (content != null || type != null) {
            String baseContent = content != null ? content : emoji.getContent();
            String baseType = type != null ? type : emoji.getType();
            emoji.setType(normalizeType(baseContent, baseType));
        }
        if (groupIdProvided) {
            emoji.setGroupId(resolveGroupId(groupId));
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

    private String normalizeType(String content, String type) {
        if (type != null && !type.isBlank() && !EMOJI_TYPES.contains(type)) {
            throw new BusinessException(400, "type 必须是 emoji / kaomoji / image");
        }
        return EmojiContentRules.resolveEmojiType(content, type);
    }

    /** 校验 groupId（null / 0 表示未分组） */
    private Integer resolveGroupId(Integer groupId) {
        if (groupId == null || groupId == 0) {
            return null;
        }
        if (groupId < 0) {
            throw new BusinessException(400, "groupId 必须是正整数");
        }
        emojiGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(400, "分组不存在"));
        return groupId;
    }

    private Map<String, Object> toMapWithGroup(Emoji emoji) {
        Map<String, Object> map = toMap(emoji);
        map.put("groupId", emoji.getGroupId());
        map.put("groupName", emoji.getGroupId() != null
                ? emojiGroupRepository.findById(emoji.getGroupId())
                        .map(EmojiGroup::getName).orElse(null)
                : null);
        return map;
    }

    private Map<String, Object> toMap(Emoji emoji) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", emoji.getId());
        map.put("content", emoji.getContent());
        map.put("type", emoji.getType());
        map.put("groupId", emoji.getGroupId());
        map.put("isCustom", emoji.getIsCustom());
        map.put("enabled", emoji.getEnabled());
        map.put("sortOrder", emoji.getSortOrder());
        map.put("createdAt", emoji.getCreatedAt());
        return map;
    }
}
