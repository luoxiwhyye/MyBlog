package com.myblog.myblogspringboot.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.myblog.myblogspringboot.dto.CommentRequest;
import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.entity.Article;
import com.myblog.myblogspringboot.entity.Comment;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.ArticleRepository;
import com.myblog.myblogspringboot.repository.CommentRepository;

import jakarta.persistence.criteria.Predicate;

@Service
public class CommentService {

    private static final org.slf4j.Logger log =
            org.slf4j.LoggerFactory.getLogger(CommentService.class);

    private final CommentRepository commentRepository;
    private final ArticleRepository articleRepository;
    private final CommentNotifierService commentNotifier;

    public CommentService(CommentRepository commentRepository,
                          ArticleRepository articleRepository,
                          CommentNotifierService commentNotifier) {
        this.commentRepository = commentRepository;
        this.articleRepository = articleRepository;
        this.commentNotifier = commentNotifier;
    }

    public PageResponse<Map<String, Object>> getComments(int page, int pageSize, Integer articleId,
                                                          String status, String sortBy, boolean topLevelOnly,
                                                          boolean isAdmin) {
        Sort sort = "hottest".equals(sortBy)
                ? Sort.by(Sort.Direction.DESC, "likeCount", "createdAt")
                : Sort.by(Sort.Direction.DESC, "createdAt");
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

            return cb.and(predicates.toArray(Predicate[]::new));
        };

        Page<Comment> commentPage = commentRepository.findAll(spec, pageable);
        List<Map<String, Object>> list = new ArrayList<>();

        // Batch load replies for top-level comments (两级结构)
        if (topLevelOnly && !commentPage.getContent().isEmpty()) {
            List<Integer> parentIds = commentPage.getContent().stream()
                    .map(Comment::getId).toList();
            List<Comment> allReplies = commentRepository.findByParentIdInAndStatusOrderByCreatedAtAsc(parentIds, "approved");
            Map<Integer, List<Map<String, Object>>> repliesMap = new HashMap<>();

            for (Comment reply : allReplies) {
                repliesMap.computeIfAbsent(reply.getParentId(), k -> new ArrayList<>())
                        .add(toMap(reply, isAdmin));
            }

            for (Comment comment : commentPage.getContent()) {
                Map<String, Object> map = toMap(comment, isAdmin);
                map.put("replies", repliesMap.getOrDefault(comment.getId(), List.of()));
                list.add(map);
            }
        } else {
            list = commentPage.getContent().stream()
                    .map(c -> toMap(c, isAdmin)).toList();
        }

        return new PageResponse<>(list, commentPage.getTotalElements(), page, pageSize);
    }

    @Transactional
    public Comment createComment(CommentRequest request, String authorIp) {
        // Check article exists
        Article article = articleRepository.findByIdWithDetails(request.getArticleId())
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
        // 「回复谁」单独记录：前端会把 parentId 规整到顶层，丢掉这个信息会让二级回复者
        // 永远收不到通知（对标 Express createComment 的 replyToId）
        comment.setReplyToId(request.getReplyToId() != null
                ? request.getReplyToId() : request.getParentId());
        comment.setAuthorName(request.getAuthorName());
        comment.setAuthorEmail(request.getAuthorEmail());
        comment.setAuthorUrl(request.getAuthorUrl());
        comment.setAuthorIp(authorIp != null ? authorIp : "");
        comment.setContent(request.getContent());
        comment.setStatus("pending");
        comment.setLikeCount(0);
        // 访客显式勾选才为 true；未传 / null = 不接收
        comment.setNotifyEmail(Boolean.TRUE.equals(request.getNotifyEmail()));

        Comment saved = commentRepository.save(comment);

        // 异步邮件通知（fire-and-forget，失败不影响评论主流程）
        //
        // 通知时机分两类：
        //   ① 顶层评论 → 博主：创建即发（博主是审核方，需要第一时间知道有新评论）；
        //   ② 回复 → 被回复者：延后到审核通过（见 updateCommentStatus），
        //      避免未审核的垃圾 / 恶意回复直接打扰被回复者。
        if (saved.getParentId() == null) {
            String authorName = saved.getAuthorName();
            String content = saved.getContent();
            CompletableFuture.runAsync(() -> {
                try {
                    commentNotifier.notifyBlogger(article, authorName, content);
                } catch (Exception e) {
                    log.error("[commentNotifier] 通知博主失败: {}", e.getMessage());
                }
            });
        }

        return saved;
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
        // 状态只有三档：pending（待审核）/ approved（已审核）/ deleted（回收站）
        if (!List.of("pending", "approved", "deleted").contains(status)) {
            throw new BusinessException(400, "状态值无效");
        }

        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "评论不存在"));
        String previousStatus = comment.getStatus();
        comment.setStatus(status);
        commentRepository.save(comment);

        // 回复通知延后到「审核通过」时发送：只在状态真正由「非 approved」变为
        // approved 时发一次，重复审核不重复发信。
        if ("approved".equals(status)
                && !"approved".equals(previousStatus)
                && comment.getParentId() != null) {
            Integer commentId = comment.getId();
            CompletableFuture.runAsync(() -> {
                try {
                    notifyRepliedAfterApproved(commentId);
                } catch (Exception e) {
                    log.error("[commentNotifier] 回复通知发送失败: {}", e.getMessage());
                }
            });
        }
    }

    /**
     * 回复审核通过后，通知被回复者。
     *
     * 与顶层评论「创建即通知博主」不同：回复等到 approved 后才发信，避免未审核的
     * 垃圾 / 恶意回复直接打扰被回复者（邮件没有退订途径），与「审核通过后才展示」
     * 的语义一致。（对标 Express controllers/commentController.js 的 notifyCommentReplied）
     *
     * 订阅开关：收件人（= 被回复的那条评论的作者）必须勾选过「有人回复我时，邮件通知我」。
     * 列默认 0 → 存量评论者不再收到回复邮件，这是「默认不接收」的预期结果。
     *
     * ⚠️ 收件人是 replyToId 指向的那条评论的作者，不是 parentId：评论是两级扁平结构，
     * 回复二级评论时 parentId 已被规整到顶层，只有 replyToId 才代表「你回复的是谁」。
     * replyToId 为空时（存量数据 / 旧客户端）回退用 parentId，与改动前的行为一致。
     */
    private void notifyRepliedAfterApproved(Integer commentId) {
        Comment reply = commentRepository.findById(commentId).orElse(null);
        if (reply == null || reply.getParentId() == null) {
            return;
        }
        Integer targetId = reply.getReplyToId() != null
                ? reply.getReplyToId() : reply.getParentId();
        Comment recipient = commentRepository.findById(targetId).orElse(null);
        if (recipient == null) {
            return;
        }
        // 未订阅就静默短路（与「收件人邮箱为空」同一种跳过语义）
        if (!Boolean.TRUE.equals(recipient.getNotifyEmail())) {
            return;
        }
        Article article = articleRepository.findByIdWithDetails(reply.getArticleId()).orElse(null);
        if (article == null) {
            return;
        }
        commentNotifier.notifyReplied(article, recipient, reply.getAuthorName(), reply.getContent());
    }

    @Transactional
    public int likeComment(Integer id) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "评论不存在"));
        commentRepository.incrementLikeCount(id);
        // 刷新以获取更新后的值
        commentRepository.flush();
        Comment updated = commentRepository.findById(id).orElse(comment);
        return updated.getLikeCount();
    }

    private Map<String, Object> toMap(Comment c) {
        return toMap(c, false);
    }

    /**
     * @param includeNotifyEmail 仅管理端为 true：「接收通知」是访客的订阅偏好，
     *                           公开列表没必要一并发出（与 Express 的 getComments 一致）。
     *                           注意该键必须追加在最后，保证与 Express 的 JSON 键序一致。
     */
    private Map<String, Object> toMap(Comment c, boolean includeNotifyEmail) {
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
        map.put("createdAt", c.getCreatedAt());
        if (includeNotifyEmail) {
            map.put("notifyEmail", Boolean.TRUE.equals(c.getNotifyEmail()));
        }
        return map;
    }
}
