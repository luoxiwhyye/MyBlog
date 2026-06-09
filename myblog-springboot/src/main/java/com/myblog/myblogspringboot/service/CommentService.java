package com.myblog.myblogspringboot.service;

import com.myblog.myblogspringboot.dto.CommentRequest;
import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.entity.Comment;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.ArticleRepository;
import com.myblog.myblogspringboot.repository.CommentRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final ArticleRepository articleRepository;

    public CommentService(CommentRepository commentRepository, ArticleRepository articleRepository) {
        this.commentRepository = commentRepository;
        this.articleRepository = articleRepository;
    }

    public PageResponse<Map<String, Object>> getComments(int page, int pageSize, Integer articleId,
                                                          String status, String sortBy, boolean topLevelOnly,
                                                          boolean isAdmin) {
        Sort sort = "hottest".equals(sortBy)
                ? Sort.by(Sort.Direction.DESC, "likeCount", "createAt")
                : Sort.by(Sort.Direction.DESC, "createAt");
        Pageable pageable = PageRequest.of(page - 1, pageSize, sort);

        Specification<Comment> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (articleId != null) {
                predicates.add(cb.equal(root.get("articleId"), articleId));
            }
            if (topLevelOnly) {
                predicates.add(cb.isNull(root.get("parentId")));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            } else if (!isAdmin) {
                predicates.add(cb.equal(root.get("status"), "approved"));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Comment> commentPage = commentRepository.findAll(spec, pageable);
        List<Map<String, Object>> list = new ArrayList<>();

        // Batch load replies for top-level comments
        if (topLevelOnly && !commentPage.getContent().isEmpty()) {
            List<Integer> parentIds = commentPage.getContent().stream()
                    .map(Comment::getId).toList();
            List<Comment> allReplies = commentRepository.findByParentIdInAndStatusOrderByCreateAtAsc(parentIds, "approved");
            Map<Integer, List<Map<String, Object>>> repliesMap = new HashMap<>();

            for (Comment reply : allReplies) {
                repliesMap.computeIfAbsent(reply.getParentId(), k -> new ArrayList<>())
                        .add(toMap(reply));
            }

            for (Comment comment : commentPage.getContent()) {
                Map<String, Object> map = toMap(comment);
                map.put("replies", repliesMap.getOrDefault(comment.getId(), List.of()));
                list.add(map);
            }
        } else {
            list = commentPage.getContent().stream().map(this::toMap).toList();
        }

        return new PageResponse<>(list, commentPage.getTotalElements(), page, pageSize);
    }

    @Transactional
    public Comment createComment(CommentRequest request, String authorIp) {
        // Check article exists
        articleRepository.findByIdWithDetails(request.getArticleId())
                .orElseThrow(() -> new BusinessException(404, "文章不存在"));

        // Validate URL format
        if (request.getAuthorUrl() != null && !request.getAuthorUrl().isBlank()) {
            String urlPattern = "^https?://(?:www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$";
            if (!request.getAuthorUrl().matches(urlPattern)) {
                throw new BusinessException(400, "网址格式不正确");
            }
        }

        Comment comment = new Comment();
        comment.setArticleId(request.getArticleId());
        comment.setParentId(request.getParentId());
        comment.setAuthorName(request.getAuthorName());
        comment.setAuthorEmail(request.getAuthorEmail());
        comment.setAuthorUrl(request.getAuthorUrl());
        comment.setAuthorIp(authorIp != null ? authorIp : "");
        comment.setContent(request.getContent());
        comment.setStatus("pending");
        comment.setLikeCount(0);

        return commentRepository.save(comment);
    }

    @Transactional
    public void deleteComment(Integer id, Integer userId, String userEmail, boolean isAdmin) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "评论不存在"));

        if (!isAdmin && (userEmail == null || !userEmail.equals(comment.getAuthorEmail()))) {
            throw new BusinessException(403, "无权删除该评论");
        }

        comment.setStatus("deleted");
        commentRepository.save(comment);
    }

    @Transactional
    public void restoreComment(Integer id) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "评论不存在"));
        comment.setStatus("pending");
        commentRepository.save(comment);
    }

    @Transactional
    public void hardDeleteComment(Integer id) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "评论不存在"));
        commentRepository.delete(comment);
    }

    @Transactional
    public void updateCommentStatus(Integer id, String status) {
        if (!List.of("pending", "approved", "spam", "deleted").contains(status)) {
            throw new BusinessException(400, "状态值无效");
        }

        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "评论不存在"));
        comment.setStatus(status);
        commentRepository.save(comment);
    }

    @Transactional
    public void likeComment(Integer id) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "评论不存在"));
        commentRepository.incrementLikeCount(id);
    }

    private Map<String, Object> toMap(Comment c) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", c.getId());
        map.put("articleId", c.getArticleId());
        map.put("parentId", c.getParentId());
        map.put("authorName", c.getAuthorName());
        map.put("authorEmail", c.getAuthorEmail());
        map.put("authorUrl", c.getAuthorUrl());
        map.put("authorIp", c.getAuthorIp());
        map.put("content", c.getContent());
        map.put("likeCount", c.getLikeCount());
        map.put("status", c.getStatus());
        map.put("createdAt", c.getCreateAt());
        return map;
    }
}
