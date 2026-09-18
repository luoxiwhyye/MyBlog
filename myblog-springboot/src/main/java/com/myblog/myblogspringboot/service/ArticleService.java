package com.myblog.myblogspringboot.service;

import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.myblog.myblogspringboot.dto.AdjacentArticlesDTO;
import com.myblog.myblogspringboot.dto.ArticleDTO;
import com.myblog.myblogspringboot.dto.ArticleNavDTO;
import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.dto.SearchItemDTO;
import com.myblog.myblogspringboot.entity.Article;
import com.myblog.myblogspringboot.entity.Label;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.ArticleRepository;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;

@Service
@Transactional(readOnly = true)
public class ArticleService {

    private final ArticleRepository articleRepository;
    private final MeilisearchService meilisearchService;

    /** 索引里 createdAt 的源时区（与写库时区一致，见 config/JacksonConfig.java 的说明） */
    @Value("${app.time-zone:Asia/Shanghai}")
    private String timeZone;

    public ArticleService(ArticleRepository articleRepository, MeilisearchService meilisearchService) {
        this.articleRepository = articleRepository;
        this.meilisearchService = meilisearchService;
    }

    @Cacheable(value = "articles", key = "'list:' + #page + ':' + #pageSize + ':' + #typeId + ':' + #labelId + ':' + #keyword + ':' + #status + ':' + #sortBy + ':' + #sortOrder + ':' + #isAdmin", unless = "#result == null")
    public PageResponse<ArticleDTO> getArticles(int page, int pageSize, Integer typeId, Integer labelId,
                                                 String keyword, String status, String sortBy, String sortOrder,
                                                 boolean isAdmin) {
        // F-01: 关键词搜索优先使用 Meilisearch
        if (keyword != null && !keyword.isBlank() && "published".equals(status)) {
            MeilisearchService.SearchHit hit = meilisearchService.search(keyword, page, pageSize, typeId);
            if (hit != null) {
                if (hit.getIds().isEmpty()) {
                    return new PageResponse<>(List.of(), hit.getTotal(), page, pageSize);
                }
                List<Article> articles = articleRepository.findAllById(hit.getIds());
                // 保持 Meilisearch 返回的顺序
                Map<Integer, Article> articleMap = new HashMap<>();
                for (Article a : articles) {
                    articleMap.put(a.getId(), a);
                }
                List<ArticleDTO> dtos = hit.getIds().stream()
                        .map(articleMap::get)
                        .filter(Objects::nonNull)
                        .map(this::toDTO)
                        .collect(Collectors.toList());
                return new PageResponse<>(dtos, hit.getTotal(), page, pageSize);
            }
            // Meilisearch 不可用，降级到 SQL LIKE（继续走下面逻辑）
        }

        Pageable pageable = buildPageable(page, pageSize, sortBy, sortOrder);

        Specification<Article> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            // 软删除过滤
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (typeId != null) {
                predicates.add(cb.equal(root.get("typeId"), typeId));
            }
            if (labelId != null) {
                Join<Article, Label> labelJoin = root.join("labels");
                predicates.add(cb.equal(labelJoin.get("id"), labelId));
            }
            if (keyword != null && !keyword.isBlank()) {
                String like = "%" + keyword + "%";
                predicates.add(cb.or(
                    cb.like(root.get("title"), like),
                    cb.like(root.get("content"), like)
                ));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            } else if (!isAdmin) {
                predicates.add(cb.equal(root.get("status"), "published"));
            }

            query.distinct(true);
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Article> articlePage = articleRepository.findAll(spec, pageable);
        List<ArticleDTO> dtos = articlePage.getContent().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());

        return new PageResponse<>(dtos, articlePage.getTotalElements(), page, pageSize);
    }

    /**
     * 轻量关键词搜索（前台命令面板 / 全局搜索入口）
     *
     * 优先走 Meilisearch（命中标题 / 摘要 / 正文），不可用时降级 SQL LIKE。
     * engine 取值：meilisearch / like / none（未传关键词）。
     */
    public Map<String, Object> searchBrief(String keyword, int limit) {
        String kw = keyword == null ? "" : keyword.trim();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("keyword", kw);

        if (kw.isEmpty()) {
            result.put("engine", "none");
            result.put("total", 0);
            result.put("list", List.of());
            return result;
        }

        int safeLimit = Math.max(1, Math.min(limit, 20));

        MeilisearchService.SearchHit hit = meilisearchService.search(kw, 1, safeLimit, null);
        if (hit != null) {
            Map<Integer, SearchItemDTO> byId = new HashMap<>();
            for (SearchItemDTO item : articleRepository.findBriefByIds(hit.getIds())) {
                byId.put(item.getId(), item);
            }
            List<SearchItemDTO> list = hit.getIds().stream()
                    .map(byId::get)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            result.put("engine", "meilisearch");
            result.put("total", hit.getTotal());
            result.put("list", list);
            return result;
        }

        List<SearchItemDTO> list = articleRepository.searchBrief(kw, PageRequest.of(0, safeLimit));
        result.put("engine", "like");
        result.put("total", list.size());
        result.put("list", list);
        return result;
    }

    /**
     * 相关推荐（公开）：共享标签 ×2 + 同分类 ×1，仅返回正分项。
     *
     * <p>响应结构与 Express 的 getRelatedArticles 保持一致：除导航字段外还回传
     * relevanceScore 与 sharedLabels（命中标签名），让前台能显示「为什么相关」。
     * <p>文章不存在时返回空列表（与 Express 的 200 + [] 行为一致，不抛 404）。
     */
    public List<ArticleNavDTO> getRelatedArticles(Integer id, int limit) {
        Article current = articleRepository.findByIdWithDetails(id).orElse(null);
        if (current == null) {
            return List.of();
        }

        int safeLimit = Math.max(1, Math.min(limit, 12));

        List<Integer> currentLabelIds = current.getLabels().stream()
                .map(Label::getId)
                .filter(Objects::nonNull)
                .sorted()
                .collect(Collectors.toList());
        // 无标签时传哨兵值，避免 native 查询展开成非法的 IN ()
        List<Integer> probeLabelIds = currentLabelIds.isEmpty() ? List.of(-1) : currentLabelIds;

        List<Object[]> scoredRows = articleRepository.findRelatedScoredIds(
                id, probeLabelIds, current.getTypeId(), safeLimit);
        if (scoredRows.isEmpty()) {
            return List.of();
        }

        // SQL 已按 得分/热度/时间 排序，LinkedHashMap 保留该顺序
        Map<Integer, Integer> scoreById = new LinkedHashMap<>();
        for (Object[] row : scoredRows) {
            scoreById.put(((Number) row[0]).intValue(), ((Number) row[1]).intValue());
        }

        Map<Integer, Article> articleById = new HashMap<>();
        for (Article article : articleRepository.findAllWithDetailsByIds(scoreById.keySet())) {
            articleById.put(article.getId(), article);
        }

        Set<Integer> currentLabelIdSet = new HashSet<>(currentLabelIds);
        List<ArticleNavDTO> result = new ArrayList<>();
        for (Map.Entry<Integer, Integer> entry : scoreById.entrySet()) {
            Article article = articleById.get(entry.getKey());
            if (article == null) {
                continue;
            }
            ArticleNavDTO dto = toNavDTO(article, true);
            dto.setRelevanceScore(entry.getValue());
            dto.setSharedLabels(article.getLabels().stream()
                    .filter(l -> currentLabelIdSet.contains(l.getId()))
                    .sorted(Comparator.comparing(Label::getId))
                    .map(Label::getLabelName)
                    .collect(Collectors.toList()));
            result.add(dto);
        }
        return result;
    }

    /**
     * 上一篇 / 下一篇（公开）：按 id 排序取相邻已发布文章（不区分分类，与 Express 一致）。
     */
    public AdjacentArticlesDTO getAdjacentArticles(Integer id) {
        List<Article> prevList = articleRepository.findPublishedBefore(id, PageRequest.of(0, 1));
        List<Article> nextList = articleRepository.findPublishedAfter(id, PageRequest.of(0, 1));
        return new AdjacentArticlesDTO(
                prevList.isEmpty() ? null : toNavDTO(prevList.get(0), false),
                nextList.isEmpty() ? null : toNavDTO(nextList.get(0), false));
    }

    /**
     * 导航类轻量 DTO。includeViewCount=false 时 viewCount 留空（被 non_null 省略），
     * 与 Express 的「上一篇 / 下一篇」结构一致。
     */
    private ArticleNavDTO toNavDTO(Article article, boolean includeViewCount) {
        ArticleNavDTO dto = new ArticleNavDTO();
        dto.setId(article.getId());
        dto.setTitle(article.getTitle());
        dto.setSummary(article.getSummary());
        dto.setCoverImage(article.getCoverImage());
        dto.setCreatedAt(article.getCreatedAt());
        if (includeViewCount) {
            dto.setViewCount(article.getViewCount());
        }
        if (article.getType() != null) {
            dto.setType(new ArticleDTO.TypeInfo(article.getType().getId(), article.getType().getTypeName()));
        }
        return dto;
    }

    public PageResponse<ArticleDTO> getTrashArticles(int page, int pageSize) {
        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "deletedAt"));

        Specification<Article> spec = (root, query, cb) ->
                cb.isNotNull(root.get("deletedAt"));

        Page<Article> articlePage = articleRepository.findAll(spec, pageable);
        List<ArticleDTO> dtos = articlePage.getContent().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());

        return new PageResponse<>(dtos, articlePage.getTotalElements(), page, pageSize);
    }

    /**
     * 文章详情 — 不缓存（浏览量需实时自增，与 Express 端 SSR 详情行为一致）。
     * 列表接口仍走 @Cacheable 加速。
     *
     * ⚠️ 必须显式 readOnly = false：类级 @Transactional(readOnly = true) 会把连接设为只读，
     * 而本方法的 incrementViewCount 是写操作，否则 Hibernate 报
     * "Connection is read-only. Queries leading to data modification are not allowed"（详情页 500）。
     */
    @Transactional(readOnly = false)
    public ArticleDTO getArticleById(Integer id, boolean isAdmin) {
        Article article = articleRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException(404, "文章不存在"));

        if (!"published".equals(article.getStatus()) && !isAdmin) {
            throw new BusinessException(403, "无权访问该文章");
        }

        articleRepository.incrementViewCount(id);

        // ⚠️ 不要写成 article.setViewCount(article.getViewCount() + 1)：那会把托管实体
        //    改脏，事务提交时 Hibernate 再发一次 UPDATE，而实体的 @PreUpdate 会把
        //    updatedAt 设成当前时间 —— 于是「阅读」又变成了「编辑」，把
        //    incrementViewCount 里保住的 updated_at 抹掉。
        //    改为只在返回的 DTO 上体现 +1。
        ArticleDTO dto = toDTO(article);
        dto.setViewCount(dto.getViewCount() == null ? 1 : dto.getViewCount() + 1);
        return dto;
    }

    @Transactional
    @CacheEvict(value = "articles", allEntries = true)
    public ArticleDTO createArticle(String title, String content, String summary, Integer typeId,
                                     String coverImage, String status, String contentFormat, List<Integer> labelIds,
                                     Boolean commentEnabled) {
        if (title == null || title.isBlank() || content == null || content.isBlank() || typeId == null) {
            throw new BusinessException(400, "标题、内容和分类不能为空");
        }

        Article article = new Article();
        article.setTitle(title);
        article.setContent(content);
        article.setContentFormat(normalizeContentFormat(contentFormat));
        article.setSummary(summary != null ? summary : "");
        article.setTypeId(typeId);
        article.setCoverImage(coverImage != null ? coverImage : "");
        article.setStatus(status != null ? status : "draft");
        article.setViewCount(0);
        // 未传时按「开放」——与建表默认值 1 对齐（旧客户端不带这个字段）
        article.setCommentEnabled(commentEnabled != null ? commentEnabled : Boolean.TRUE);

        if (labelIds != null && !labelIds.isEmpty()) {
            article.setLabels(labelIds.stream().map(Label::new).collect(Collectors.toSet()));
        }

        Article saved = articleRepository.save(article);
        ArticleDTO dto = toDTO(articleRepository.findByIdWithDetails(saved.getId()).orElse(saved));
        // F-01: 同步到 Meilisearch（仅已发布文章）
        if ("published".equals(dto.getStatus())) {
            syncToMeilisearch(dto);
        }
        return dto;
    }

    @Transactional
    @CacheEvict(value = "articles", allEntries = true)
    public ArticleDTO updateArticle(Integer id, String title, String content, String summary,
                                     Integer typeId, String coverImage, String status,
                                     String contentFormat, List<Integer> labelIds,
                                     Boolean commentEnabled) {
        Article article = articleRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException(404, "文章不存在"));

        if (title != null) article.setTitle(title);
        if (content != null) article.setContent(content);
        if (contentFormat != null) article.setContentFormat(normalizeContentFormat(contentFormat));
        if (summary != null) article.setSummary(summary);
        if (typeId != null) article.setTypeId(typeId);
        if (coverImage != null) article.setCoverImage(coverImage);
        if (status != null) article.setStatus(status);
        if (commentEnabled != null) article.setCommentEnabled(commentEnabled);

        if (labelIds != null) {
            if (labelIds.isEmpty()) {
                article.setLabels(new HashSet<>());
            } else {
                article.setLabels(labelIds.stream().map(Label::new).collect(Collectors.toSet()));
            }
        }

        Article saved = articleRepository.save(article);
        ArticleDTO dto = toDTO(saved);
        // F-01: 同步到 Meilisearch
        if ("published".equals(dto.getStatus())) {
            syncToMeilisearch(dto);
        } else {
            meilisearchService.deleteArticle(id);
        }
        return dto;
    }

    /**
     * 批量更新文章状态（发布 / 下架），对标 Express articleController.batchUpdateStatus。
     *
     * @return 实际受影响的行数
     */
    @Transactional
    @CacheEvict(value = "articles", allEntries = true)
    public int batchUpdateStatus(List<Integer> ids, String status) {
        if (ids == null || ids.isEmpty()) {
            throw new BusinessException(400, "ids 必须是非空数组");
        }
        if (!"draft".equals(status) && !"published".equals(status)) {
            throw new BusinessException(400, "status 必须是 draft 或 published");
        }

        List<Integer> cleanIds = ids.stream()
                .filter(Objects::nonNull)
                .filter(id -> id > 0)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
        if (cleanIds.isEmpty()) {
            throw new BusinessException(400, "文章 ID 必须是正整数");
        }

        int affected = articleRepository.updateStatusByIds(cleanIds, status);

        // F-01: 同步 Meilisearch（发布加入索引，下架移除）
        for (Integer id : cleanIds) {
            Article article = articleRepository.findByIdWithDetails(id).orElse(null);
            if (article == null) {
                continue;
            }
            if ("published".equals(article.getStatus())) {
                syncToMeilisearch(toDTO(article));
            } else {
                meilisearchService.deleteArticle(id);
            }
        }

        return affected;
    }

    @Transactional
    @CacheEvict(value = "articles", allEntries = true)
    public void softDeleteArticle(Integer id) {
        Article article = articleRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException(404, "文章不存在"));
        if (article.getDeletedAt() != null) {
            throw new BusinessException(400, "文章已在回收站中");
        }
        articleRepository.softDelete(id);
        // F-01: 从 Meilisearch 移除
        meilisearchService.deleteArticle(id);
    }

    @Transactional
    @CacheEvict(value = "articles", allEntries = true)
    public void restoreArticle(Integer id) {
        int updated = articleRepository.restore(id);
        if (updated == 0) {
            throw new BusinessException(404, "文章不存在或未被删除");
        }
        // F-01: 检查恢复后状态，决定是否同步到 Meilisearch
        ArticleDTO restoredDto = getArticleById(id, true);
        if ("published".equals(restoredDto.getStatus())) {
            syncToMeilisearch(restoredDto);
        }
    }

    @Transactional
    @CacheEvict(value = "articles", allEntries = true)
    public void hardDeleteArticle(Integer id) {
        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "文章不存在"));
        articleRepository.delete(article);
        // F-01: 从 Meilisearch 移除
        meilisearchService.deleteArticle(id);
    }

    /**
     * 收敛内容格式：只认 `markdown`，其余（含 null / 空串 / 非法值）一律按 `html`。
     *
     * <p>与 Express 的 `contentFormat === "markdown" ? "markdown" : "html"` 同口径。
     * `article.content_format` 是 **varchar 而非 enum**（无 FK、无枚举兜底），
     * 不收敛的话非法值会静默入库，只有数据体检脚本能发现。
     */
    private static String normalizeContentFormat(String contentFormat) {
        return "markdown".equals(contentFormat) ? "markdown" : "html";
    }

    /**
     * 同步文章到 Meilisearch。
     *
     * <p>⚠️ `createdAt` 必须是 **epoch 毫秒（number）**，不能是字符串：
     * Meili 把它当 sortable 属性用（`sortableAttributes`），Express 侧（增量与全量回填）
     * 写的都是 `new Date(...).getTime()`。此前这里写的是 `LocalDateTime.toString()`
     * （如 `2026-09-13T19:10:49`），于是同一个索引里混了两种类型 ——
     * 排序时行为不可预期，且与全量回填出来的文档长得不一样（谁后写就对）。
     * 源时区用 `app.time-zone`（与写库时区一致），否则整体偏移 8 小时且不报错。
     */
    private void syncToMeilisearch(ArticleDTO dto) {
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("id", dto.getId());
        doc.put("title", dto.getTitle());
        doc.put("summary", dto.getSummary() != null ? dto.getSummary() : "");
        doc.put("content", dto.getContent() != null ? dto.getContent() : "");
        doc.put("status", dto.getStatus());
        doc.put("typeId", dto.getTypeId());
        doc.put("coverImage", dto.getCoverImage() != null ? dto.getCoverImage() : "");
        doc.put("viewCount", dto.getViewCount());
        doc.put("createdAt", dto.getCreatedAt() == null
                ? System.currentTimeMillis()
                : dto.getCreatedAt().atZone(ZoneId.of(timeZone)).toInstant().toEpochMilli());
        // 与 Express 文档同形（那边是 article.deletedAt || null）；已发布文章的 deletedAt 恒为 null
        doc.put("deletedAt", null);
        meilisearchService.syncArticle(doc);
    }

    public ArticleDTO toDTO(Article article) {
        ArticleDTO dto = new ArticleDTO();
        dto.setId(article.getId());
        dto.setTitle(article.getTitle());
        dto.setSummary(article.getSummary());
        dto.setContent(article.getContent());
        dto.setContentFormat(article.getContentFormat());
        dto.setCoverImage(article.getCoverImage());
        dto.setViewCount(article.getViewCount());
        dto.setStatus(article.getStatus());
        dto.setIsPinned(article.getIsPinned());
        dto.setIsFeatured(article.getIsFeatured());
        dto.setCommentEnabled(article.getCommentEnabled());
        dto.setCreatedAt(article.getCreatedAt());
        dto.setUpdatedAt(article.getUpdatedAt());
        dto.setDeletedAt(article.getDeletedAt());
        dto.setTypeId(article.getTypeId());

        if (article.getType() != null) {
            dto.setType(new ArticleDTO.TypeInfo(article.getType().getId(), article.getType().getTypeName()));
        }

        if (article.getLabels() != null) {
            List<Label> sortedLabels = article.getLabels().stream()
                    .sorted(Comparator.comparing(Label::getId))
                    .collect(Collectors.toList());
            dto.setLabels(sortedLabels.stream()
                    .map(l -> new ArticleDTO.LabelInfo(l.getId(), l.getLabelName()))
                    .collect(Collectors.toList()));
            dto.setLabelIds(sortedLabels.stream().map(Label::getId).collect(Collectors.toList()));
        } else {
            dto.setLabels(List.of());
            dto.setLabelIds(List.of());
        }

        return dto;
    }

    private Pageable buildPageable(int page, int pageSize, String sortBy, String sortOrder) {
        String sortField = switch (sortBy != null ? sortBy : "created_at") {
            case "updated_at" -> "updatedAt";
            case "view_count" -> "viewCount";
            case "title" -> "title";
            default -> "createdAt";
        };

        Sort.Direction direction = "ASC".equalsIgnoreCase(sortOrder) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return PageRequest.of(page - 1, pageSize, Sort.by(direction, sortField));
    }
}
