package com.myblog.myblogspringboot.service;

import com.myblog.myblogspringboot.dto.ArticleDTO;
import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.entity.Article;
import com.myblog.myblogspringboot.entity.Label;
import com.myblog.myblogspringboot.entity.Type;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.ArticleRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ArticleService {

    private final ArticleRepository articleRepository;

    public ArticleService(ArticleRepository articleRepository) {
        this.articleRepository = articleRepository;
    }

    public PageResponse<ArticleDTO> getArticles(int page, int pageSize, Integer typeId, Integer labelId,
                                                 String keyword, String status, String sortBy, String sortOrder,
                                                 boolean isAdmin) {
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

    public ArticleDTO getArticleById(Integer id, boolean isAdmin) {
        Article article = articleRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException(404, "文章不存在"));

        if (!"published".equals(article.getStatus()) && !isAdmin) {
            throw new BusinessException(403, "无权访问该文章");
        }

        articleRepository.incrementViewCount(id);
        article.setViewCount(article.getViewCount() + 1);

        return toDTO(article);
    }

    @Transactional
    public ArticleDTO createArticle(String title, String content, String summary, Integer typeId,
                                     String coverImage, String status, List<Integer> labelIds) {
        if (title == null || title.isBlank() || content == null || content.isBlank() || typeId == null) {
            throw new BusinessException(400, "标题、内容和分类不能为空");
        }

        Article article = new Article();
        article.setTitle(title);
        article.setContent(content);
        article.setSummary(summary != null ? summary : "");
        article.setTypeId(typeId);
        article.setCoverImage(coverImage != null ? coverImage : "");
        article.setStatus(status != null ? status : "draft");
        article.setViewCount(0);

        if (labelIds != null && !labelIds.isEmpty()) {
            article.setLabels(labelIds.stream().map(Label::new).collect(Collectors.toSet()));
        }

        Article saved = articleRepository.save(article);
        return toDTO(articleRepository.findByIdWithDetails(saved.getId()).orElse(saved));
    }

    @Transactional
    public ArticleDTO updateArticle(Integer id, String title, String content, String summary,
                                     Integer typeId, String coverImage, String status, List<Integer> labelIds) {
        Article article = articleRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException(404, "文章不存在"));

        if (title != null) article.setTitle(title);
        if (content != null) article.setContent(content);
        if (summary != null) article.setSummary(summary);
        if (typeId != null) article.setTypeId(typeId);
        if (coverImage != null) article.setCoverImage(coverImage);
        if (status != null) article.setStatus(status);

        if (labelIds != null) {
            if (labelIds.isEmpty()) {
                article.setLabels(new HashSet<>());
            } else {
                article.setLabels(labelIds.stream().map(Label::new).collect(Collectors.toSet()));
            }
        }

        Article saved = articleRepository.save(article);
        return toDTO(saved);
    }

    @Transactional
    public void softDeleteArticle(Integer id) {
        Article article = articleRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException(404, "文章不存在"));
        if (article.getDeletedAt() != null) {
            throw new BusinessException(400, "文章已在回收站中");
        }
        articleRepository.softDelete(id);
    }

    @Transactional
    public void restoreArticle(Integer id) {
        int updated = articleRepository.restore(id);
        if (updated == 0) {
            throw new BusinessException(404, "文章不存在或未被删除");
        }
    }

    @Transactional
    public void hardDeleteArticle(Integer id) {
        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "文章不存在"));
        articleRepository.delete(article);
    }

    public ArticleDTO toDTO(Article article) {
        ArticleDTO dto = new ArticleDTO();
        dto.setId(article.getId());
        dto.setTitle(article.getTitle());
        dto.setSummary(article.getSummary());
        dto.setContent(article.getContent());
        dto.setCoverImage(article.getCoverImage());
        dto.setViewCount(article.getViewCount());
        dto.setStatus(article.getStatus());
        dto.setCreatedAt(article.getCreatedAt());
        dto.setUpdatedAt(article.getUpdatedAt());
        dto.setDeletedAt(article.getDeletedAt());
        dto.setTypeId(article.getTypeId());

        if (article.getType() != null) {
            dto.setType(new ArticleDTO.TypeInfo(article.getType().getId(), article.getType().getTypeName()));
        }

        if (article.getLabels() != null) {
            dto.setLabels(article.getLabels().stream()
                    .map(l -> new ArticleDTO.LabelInfo(l.getId(), l.getLabelName()))
                    .collect(Collectors.toList()));
        } else {
            dto.setLabels(List.of());
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
