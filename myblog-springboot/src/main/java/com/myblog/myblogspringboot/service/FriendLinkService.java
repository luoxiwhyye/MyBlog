package com.myblog.myblogspringboot.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.entity.FriendLink;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.FriendLinkRepository;

@Service
public class FriendLinkService {

    private static final Pattern URL_PATTERN = Pattern.compile("^https?://.+", Pattern.CASE_INSENSITIVE);
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final FriendLinkRepository friendLinkRepository;

    public FriendLinkService(FriendLinkRepository friendLinkRepository) {
        this.friendLinkRepository = friendLinkRepository;
    }

    /**
     * 获取友链列表（公开：仅启用；管理端：全部）
     * @param onlyEnabled 是否只取启用
     */
    @Cacheable(value = "friendLinks", key = "'list:' + #page + ':' + #pageSize + ':' + #onlyEnabled",
            unless = "#result == null || #result.list.isEmpty()")
    public PageResponse<Map<String, Object>> getFriendLinks(int page, int pageSize, boolean onlyEnabled) {
        Page<FriendLink> friendLinkPage = onlyEnabled
                ? friendLinkRepository.findEnabled(PageRequest.of(page - 1, pageSize))
                : friendLinkRepository.findAllOrdered(PageRequest.of(page - 1, pageSize));

        long total = onlyEnabled
                ? friendLinkRepository.countEnabled()
                : friendLinkRepository.count();

        List<Map<String, Object>> list = friendLinkPage.getContent().stream()
                .map(this::toMap).toList();

        return new PageResponse<>(list, total, page, pageSize);
    }

    public Map<String, Object> getFriendLinkById(Integer id) {
        FriendLink link = friendLinkRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "友链不存在"));
        return toMap(link);
    }

    @Transactional
    @CacheEvict(value = "friendLinks", allEntries = true)
    public FriendLink createFriendLink(Map<String, Object> body) {
        FriendLink link = new FriendLink();
        applyBody(link, body, false);
        return friendLinkRepository.save(link);
    }

    @Transactional
    @CacheEvict(value = "friendLinks", allEntries = true)
    public FriendLink updateFriendLink(Integer id, Map<String, Object> body) {
        FriendLink link = friendLinkRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "友链不存在"));
        applyBody(link, body, true);
        return friendLinkRepository.save(link);
    }

    @Transactional
    @CacheEvict(value = "friendLinks", allEntries = true)
    public void deleteFriendLink(Integer id) {
        FriendLink link = friendLinkRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "友链不存在"));
        friendLinkRepository.delete(link);
    }

    @Transactional
    public void incrementClickCount(Integer id) {
        friendLinkRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "友链不存在"));
        friendLinkRepository.incrementClickCount(id);
    }

    private Map<String, Object> toMap(FriendLink link) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", link.getId());
        map.put("name", link.getName());
        map.put("url", link.getUrl());
        map.put("avatar", link.getAvatar());
        map.put("description", link.getDescription());
        map.put("email", link.getEmail());
        map.put("status", Boolean.TRUE.equals(link.getStatus()));
        map.put("isSticky", Boolean.TRUE.equals(link.getIsSticky()));
        int clickCount = link.getClickCount() == null ? 0 : link.getClickCount();
        map.put("clickCount", clickCount);
        map.put("createdAt", link.getCreatedAt() != null ? link.getCreatedAt().toString() : null);
        map.put("updatedAt", link.getUpdatedAt() != null ? link.getUpdatedAt().toString() : null);
        return map;
    }

    private void applyBody(FriendLink link, Map<String, Object> body, boolean partial) {
        // name（创建必填）
        if (!partial || body.containsKey("name")) {
            String name = str(body.get("name"));
            if (name == null || name.isBlank()) {
                throw new BusinessException(400, "网站名称不能为空");
            }
            link.setName(name.trim());
        }
        // url（创建必填）
        if (!partial || body.containsKey("url")) {
            String url = str(body.get("url"));
            if (url == null || url.isBlank()) {
                throw new BusinessException(400, "网站URL不能为空");
            }
            if (!URL_PATTERN.matcher(url).matches()) {
                throw new BusinessException(400, "URL 必须以 http(s):// 开头");
            }
            link.setUrl(url.trim());
        }
        // 可选字段
        if (!partial || body.containsKey("avatar")) {
            String v = str(body.get("avatar"));
            link.setAvatar(v == null || v.isBlank() ? null : v.trim());
        }
        if (!partial || body.containsKey("description")) {
            String v = str(body.get("description"));
            link.setDescription(v == null || v.isBlank() ? null : v.trim());
        }
        if (!partial || body.containsKey("email")) {
            String v = str(body.get("email"));
            if (v != null && !v.isBlank() && !EMAIL_PATTERN.matcher(v).matches()) {
                throw new BusinessException(400, "站长邮箱格式不正确");
            }
            link.setEmail(v == null || v.isBlank() ? null : v.trim());
        }
        if (!partial || body.containsKey("status")) {
            link.setStatus(bool(body.get("status"), true));
        }
        if (!partial || body.containsKey("isSticky")) {
            link.setIsSticky(bool(body.get("isSticky"), false));
        }
    }

    private String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private Boolean bool(Object o, Boolean def) {
        if (o == null) return def;
        if (o instanceof Boolean) return (Boolean) o;
        if (o instanceof String) return Boolean.parseBoolean((String) o);
        if (o instanceof Number) return ((Number) o).intValue() != 0;
        return def;
    }
}
