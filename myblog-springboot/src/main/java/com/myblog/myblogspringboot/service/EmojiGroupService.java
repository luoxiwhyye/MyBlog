package com.myblog.myblogspringboot.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.myblog.myblogspringboot.entity.EmojiGroup;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.EmojiGroupRepository;
import com.myblog.myblogspringboot.repository.EmojiRepository;

@Service
public class EmojiGroupService {

    private final EmojiGroupRepository emojiGroupRepository;
    private final EmojiRepository emojiRepository;

    public EmojiGroupService(EmojiGroupRepository emojiGroupRepository,
                             EmojiRepository emojiRepository) {
        this.emojiGroupRepository = emojiGroupRepository;
        this.emojiRepository = emojiRepository;
    }

    public List<Map<String, Object>> getGroups() {
        List<EmojiGroup> groups = emojiGroupRepository.findAllByOrderBySortOrderAscIdAsc();
        List<Map<String, Object>> list = new ArrayList<>();
        for (EmojiGroup group : groups) {
            Map<String, Object> map = toMap(group);
            map.put("emojiCount", emojiRepository.countByGroupId(group.getId()));
            list.add(map);
        }
        return list;
    }

    @Transactional
    public Map<String, Object> createGroup(String name, String cover, Integer sortOrder) {
        validateName(name);
        String normalizedCover = normalizeCover(cover, false);

        EmojiGroup group = new EmojiGroup();
        group.setName(name.trim());
        group.setCover(normalizedCover);
        group.setSortOrder(sortOrder != null ? sortOrder : 0);
        EmojiGroup saved = emojiGroupRepository.save(group);
        return Map.of("id", saved.getId());
    }

    @Transactional
    public void updateGroup(Integer id, String name, String cover, Integer sortOrder,
                            boolean coverProvided) {
        EmojiGroup group = emojiGroupRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "分组不存在"));

        if (name != null) {
            validateName(name);
            group.setName(name.trim());
        }
        // cover 允许显式清空（传 null / 空串）
        if (coverProvided) {
            String normalizedCover = normalizeCover(cover, true);
            group.setCover(normalizedCover);
        }
        if (sortOrder != null) {
            group.setSortOrder(sortOrder);
        }
        emojiGroupRepository.save(group);
    }

    @Transactional
    public void deleteGroup(Integer id) {
        EmojiGroup group = emojiGroupRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "分组不存在"));
        // 先解除引用再删组，避免外键约束（库里虽为 ON DELETE SET NULL，双保险）
        emojiRepository.clearGroupRef(id);
        emojiGroupRepository.delete(group);
    }

    private void validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new BusinessException(400, "分组名称不能为空");
        }
        if (name.trim().length() > 50) {
            throw new BusinessException(400, "分组名称过长（≤50 字符）");
        }
    }

    /** allowEmpty=false 时空白 cover 归 null；allowEmpty=true 时空白 cover 视为「清空」 */
    private String normalizeCover(String cover, boolean allowEmpty) {
        if (cover == null || cover.isBlank()) {
            return null;
        }
        EmojiContentRules.validateTextOrImageUrl(cover, "分组标识", 500);
        return cover.trim();
    }

    private Map<String, Object> toMap(EmojiGroup group) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", group.getId());
        map.put("name", group.getName());
        map.put("cover", group.getCover());
        map.put("sortOrder", group.getSortOrder());
        map.put("createdAt", group.getCreatedAt());
        return map;
    }
}
