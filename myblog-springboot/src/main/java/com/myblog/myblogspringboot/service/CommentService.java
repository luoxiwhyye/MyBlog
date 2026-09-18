package com.myblog.myblogspringboot.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

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
                                                          boolean isAdmin, String level) {
        Sort sort = "hottest".equals(sortBy)
                ? Sort.by(Sort.Direction.DESC, "likeCount", "createdAt")
                : Sort.by(Sort.Direction.DESC, "createdAt");
        Pageable pageable = PageRequest.of(page - 1, pageSize, sort);

        // 层级筛选：top = 仅父评论、reply = 仅回复（topLevelOnly 是前台详情页的等价旧参数）
        boolean topOnly = topLevelOnly || "top".equals(level);
        boolean replyOnly = !topOnly && "reply".equals(level);

        Specification<Comment> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (articleId != null) {
                predicates.add(cb.equal(root.get("articleId"), articleId));
            }
            if (topOnly) {
                predicates.add(cb.isNull(root.get("parentId")));
            } else if (replyOnly) {
                predicates.add(cb.isNotNull(root.get("parentId")));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            } else if (isAdmin) {
                // ⚠️ 管理端默认**排除已删除**：评论管理页另有独立的「回收站」视图，
                //    列表里混入已删除项没有意义。与 Express 的 filters.excludeDeleted 同口径。
                predicates.add(cb.notEqual(root.get("status"), "deleted"));
            } else {
                predicates.add(cb.equal(root.get("status"), "approved"));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };

        Page<Comment> commentPage = commentRepository.findAll(spec, pageable);
        List<Map<String, Object>> list = new ArrayList<>();

        // Batch load replies for top-level comments (两级结构)
        // ⚠️ 只在显式 topLevelOnly 时附带回复（前台详情页用），**不是** topOnly：
        //    level=top 是管理端的平表筛选，只应当作 WHERE 条件，附带 replies 会让键集与 Express 不一致。
        if (topLevelOnly && !commentPage.getContent().isEmpty()) {
            List<Integer> parentIds = commentPage.getContent().stream()
                    .map(Comment::getId).toList();
            List<Comment> allReplies = commentRepository.findByParentIdInAndStatusOrderByCreatedAtAsc(parentIds, "approved");
            Map<Integer, List<Map<String, Object>>> repliesMap = new HashMap<>();

            // 父状态要盖到「本页父评论 + 它们的回复」上，否则回复行拿不到自己的父状态
            List<Comment> all = new ArrayList<>(commentPage.getContent());
            all.addAll(allReplies);
            Map<Integer, String> parentStatusMap = loadParentStatuses(all);

            for (Comment reply : allReplies) {
                repliesMap.computeIfAbsent(reply.getParentId(), k -> new ArrayList<>())
                        .add(toMap(reply, isAdmin, parentStatusMap));
            }

            for (Comment comment : commentPage.getContent()) {
                Map<String, Object> map = toMap(comment, isAdmin, parentStatusMap);
                map.put("replies", repliesMap.getOrDefault(comment.getId(), List.of()));
                list.add(map);
            }
        } else {
            Map<Integer, String> parentStatusMap = loadParentStatuses(commentPage.getContent());
            list = commentPage.getContent().stream()
                    .map(c -> toMap(c, isAdmin, parentStatusMap)).toList();
        }

        return new PageResponse<>(list, commentPage.getTotalElements(), page, pageSize);
    }

    /** 父评论状态（仅管理端用到，界面据此提示「父评论未通过审核」） */
    private Map<Integer, String> loadParentStatuses(List<Comment> comments) {
        List<Integer> parentIds = comments.stream()
                .map(Comment::getParentId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (parentIds.isEmpty()) {
            return Map.of();
        }

        return selectStatusRows(parentIds).stream()
                .collect(Collectors.toMap(Comment::getId, Comment::getStatus));
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

        // 连带后代：与 Express 的 softDeleteComment 一致。
        // 「已审核的子回复，其父评论必须存在且已审核」这条不变式要求父评论离开 approved 时后代跟着走，
        // 否则会出现「父已移入回收站、子还在前台露着」。
        commentRepository.updateStatusByIds(expandWithDescendants(List.of(id)), "deleted");
    }

    @Transactional
    public void restoreComment(Integer id) {
        commentRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "评论不存在"));
        // 整条线程一起回到待审核（与 Express 的 restoreComment 一致）
        commentRepository.updateStatusByIds(expandWithDescendants(List.of(id)), "pending");
    }

    @Transactional
    public void hardDeleteComment(Integer id) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "评论不存在"));
        commentRepository.delete(comment);
    }

    /** 评论状态的中文名（与后台筛选下拉一致，用于审核守卫的提示文案） */
    private static String statusLabel(String status) {
        return switch (status == null ? "" : status) {
            case "pending" -> "待审核";
            case "approved" -> "已审核";
            case "deleted" -> "已删除";
            default -> String.valueOf(status);
        };
    }

    /** 审核守卫命中项：childId = 被拦下的评论；parentMissing = 父评论不存在（外键下不应出现） */
    public record ApproveBlocker(Integer childId, Integer parentId, String parentStatus, boolean parentMissing) {}

    /** 审核守卫的提示文案（与 Express 的 approveBlockerMessage 逐字一致） */
    public static String approveBlockerMessage(ApproveBlocker blocker) {
        if (blocker.parentMissing()) {
            return "父评论 #" + blocker.parentId() + " 不存在，无法审核本条评论";
        }
        return "父评论 #" + blocker.parentId() + " 未通过审核（当前："
                + statusLabel(blocker.parentStatus()) + "），请先处理父评论后再审核本条";
    }

    /** 一次状态变更的规划结果：实际要写的 id 集合 + 是否命中审核守卫 */
    private record StatusPlan(List<Integer> targets, ApproveBlocker blocker) {}

    /** 取若干行当前状态（按 id 排序，保证遍历顺序稳定、提示文案可预期） */
    private List<Comment> selectStatusRows(List<Integer> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        List<Comment> rows = new ArrayList<>(commentRepository.findAllById(ids));
        rows.sort(Comparator.comparing(Comment::getId));
        return rows;
    }

    /**
     * 审核守卫：不允许出现「子回复已审核、父评论未通过」。
     *
     * <p>⚠️ 判定依据是**改完之后**的状态：同一批里如果父评论也会变成 approved，
     * 子回复就不算违规（否则批量勾选「父 + 子」会被自己拦下）。
     *
     * <p>与 Express 的 findApproveBlocker 同口径。
     */
    private ApproveBlocker findApproveBlocker(List<Integer> affectedIds) {
        List<Comment> rows = selectStatusRows(affectedIds);
        Set<Integer> affected = new HashSet<>(affectedIds);

        List<Integer> outsideParentIds = rows.stream()
                .map(Comment::getParentId)
                .filter(Objects::nonNull)
                .filter(parentId -> !affected.contains(parentId))
                .distinct()
                .toList();
        if (outsideParentIds.isEmpty()) {
            return null;
        }

        Map<Integer, String> statusById = selectStatusRows(outsideParentIds).stream()
                .collect(Collectors.toMap(Comment::getId, Comment::getStatus));

        for (Comment row : rows) {
            Integer parentId = row.getParentId();
            if (parentId == null || affected.contains(parentId)) {
                continue;
            }

            String parentStatus = statusById.get(parentId);
            if (parentStatus == null) {
                return new ApproveBlocker(row.getId(), parentId, null, true);
            }
            if (!"approved".equals(parentStatus)) {
                return new ApproveBlocker(row.getId(), parentId, parentStatus, false);
            }
        }

        return null;
    }

    /**
     * 计算「把 rootIds 设为 status」实际要影响哪些行。
     *
     * <p>级联规则按目标状态区分 —— 三者都服务同一条不变式
     * 「已审核的子回复，其父评论必须存在且已审核」：
     * <ul>
     *   <li>approved：连带后代中**非回收站**的行（不静默把回收站里的评论放出来）；
     *       单条端点不连带（cascadeApproved = false），避免顺手通过没审过的回复</li>
     *   <li>pending ：连带后代中**已审核**的行（否则会出现「父待审核、子已审核」）</li>
     *   <li>deleted ：连带**全部**后代（与单条删除同语义）</li>
     * </ul>
     *
     * <p>与 Express 的 planStatusChange 同口径。
     */
    private StatusPlan planStatusChange(List<Integer> rootIds, String status, boolean cascadeApproved) {
        List<Comment> rows = selectStatusRows(expandWithDescendants(rootIds));
        Set<Integer> roots = new HashSet<>(rootIds);

        if ("approved".equals(status)) {
            List<Integer> targets = cascadeApproved
                    ? rows.stream()
                            .filter(row -> !"deleted".equals(row.getStatus()) || roots.contains(row.getId()))
                            .map(Comment::getId)
                            .toList()
                    : roots.stream().sorted().toList();

            return new StatusPlan(targets, findApproveBlocker(targets));
        }

        if ("deleted".equals(status)) {
            return new StatusPlan(rows.stream().map(Comment::getId).toList(), null);
        }

        return new StatusPlan(
                rows.stream()
                        .filter(row -> "approved".equals(row.getStatus()) || roots.contains(row.getId()))
                        .map(Comment::getId)
                        .toList(),
                null);
    }

    /** 异步发送「回复审核通过」通知（fire-and-forget，失败只记日志） */
    private void notifyRepliedAsync(Integer commentId) {
        CompletableFuture.runAsync(() -> {
            try {
                notifyRepliedAfterApproved(commentId);
            } catch (Exception e) {
                log.error("[commentNotifier] 回复通知发送失败: {}", e.getMessage());
            }
        });
    }

    /** 单条状态变更结果：found = 评论是否存在；blocker = 命中审核守卫 */
    public record ApplyResult(boolean found, ApproveBlocker blocker, int affected) {}

    /**
     * 单条状态变更（审核 / 打回待审核 / 移入回收站）：先做审核守卫，再按目标状态级联。
     *
     * <p>与 Express 的 applyCommentStatus 同口径；通知时机也是「由非 approved 变为 approved」。
     */
    @Transactional
    public ApplyResult applyCommentStatus(Integer id, String status) {
        // 状态只有三档：pending（待审核）/ approved（已审核）/ deleted（回收站）
        if (!List.of("pending", "approved", "deleted").contains(status)) {
            throw new BusinessException(400, "状态值无效");
        }

        Comment previous = commentRepository.findById(id).orElse(null);
        if (previous == null) {
            return new ApplyResult(false, null, 0);
        }

        StatusPlan plan = planStatusChange(List.of(id), status, false);
        if (plan.blocker() != null) {
            return new ApplyResult(true, plan.blocker(), 0);
        }

        commentRepository.updateStatusByIds(plan.targets(), status);

        if ("approved".equals(status)
                && !"approved".equals(previous.getStatus())
                && previous.getParentId() != null) {
            notifyRepliedAsync(id);
        }

        return new ApplyResult(true, null, plan.targets().size());
    }

    /** 批量操作结果：affected = 实际纳入范围的行数（含后代）；requested = 传入的根 id 数 */
    public record BatchResult(int affected, int requested) {}

    /**
     * 批量更新评论状态（含全部后代）。
     *
     * <p>对象语义与单条删除 / 恢复一致：传入顶层评论即连带其后代，避免出现
     * 「父已移入回收站、子还在前台露着」。
     *
     * <p>⚠️ **必须先读旧状态再改**：回复通知延后到「审核通过」才发，
     * 只发一条 UPDATE 就判不出「哪些回复是本次才变成 approved 的」，会静默漏掉全部回复邮件。
     */
    @Transactional
    public BatchResult batchUpdateStatus(List<Integer> ids, String status) {
        // 状态只有三档：pending（待审核）/ approved（已审核）/ deleted（回收站）
        if (!List.of("pending", "approved", "deleted").contains(status)) {
            throw new BusinessException(400, "状态值无效");
        }

        // ⚠️ 两句文案与 Express 的 validateBatchCommentStatus 逐字一致：
        //    空数组 → 「ids 必须是非空数组」；非空但全为非法 id → 「评论 ID 必须是正整数」
        List<Integer> rawIds = ids == null ? List.of() : ids;
        if (rawIds.isEmpty()) {
            throw new BusinessException(400, "ids 必须是非空数组");
        }
        List<Integer> cleanIds = rawIds.stream()
                .filter(Objects::nonNull)
                .filter(id -> id > 0)
                .distinct()
                .collect(Collectors.toList());
        if (cleanIds.isEmpty()) {
            throw new BusinessException(400, "评论 ID 必须是正整数");
        }

        StatusPlan plan = planStatusChange(cleanIds, status, true);
        // 命中审核守卫：整批拒绝，不做部分写入
        if (plan.blocker() != null) {
            throw new BusinessException(400, approveBlockerMessage(plan.blocker()));
        }

        // 先读快照：下面的批量 UPDATE 绕过实体层，改完就读不到旧状态了
        List<Comment> before = selectStatusRows(plan.targets());
        if (before.isEmpty()) {
            throw new BusinessException(404, "评论不存在");
        }

        // 由「非 approved」变为 approved 的回复（待发通知）—— 从改之前的快照判定
        List<Integer> newlyApprovedReplyIds = "approved".equals(status)
                ? before.stream()
                        .filter(c -> !"approved".equals(c.getStatus()) && c.getParentId() != null)
                        .map(Comment::getId)
                        .toList()
                : List.of();

        commentRepository.updateStatusByIds(plan.targets(), status);

        for (Integer commentId : newlyApprovedReplyIds) {
            notifyRepliedAsync(commentId);
        }

        return new BatchResult(before.size(), cleanIds.size());
    }

    /**
     * 展开「根评论 + 其全部后代」。
     *
     * <p>评论是两级结构（回复的回复会被规整挂到顶层父级下），正常只需一层；
     * 仍按逐层展开实现，兼顾历史数据里可能存在的更深父链。
     *
     * <p>⚠️ 用 Set 记录已纳入的 id：一来自带去重（多个根共享同一后代时只取一次），
     * 二来防自环死循环（parent_id 指向自己时，无守卫的递归会永不终止）。
     */
    private List<Integer> expandWithDescendants(List<Integer> rootIds) {
        Set<Integer> all = new LinkedHashSet<>(rootIds);
        List<Integer> currentLevel = new ArrayList<>(all);

        while (!currentLevel.isEmpty()) {
            List<Integer> fresh = commentRepository.findIdsByParentIdIn(currentLevel).stream()
                    .filter(Objects::nonNull)
                    .filter(id -> !all.contains(id))
                    .toList();
            if (fresh.isEmpty()) {
                break;
            }

            all.addAll(fresh);
            currentLevel = fresh;
        }

        return new ArrayList<>(all);
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

    /**
     * @param includeNotifyEmail 仅管理端为 true：「接收通知」是访客的订阅偏好，
     *                           公开列表没必要一并发出（与 Express 的 getComments 一致）。
     *                           注意该键必须追加在最后，保证与 Express 的 JSON 键序一致。
     * @param parentStatusMap    父评论 id → 状态；同样只在管理端写入（界面据此提示「父评论未通过审核」）
     */
    private Map<String, Object> toMap(Comment c, boolean includeNotifyEmail,
                                      Map<Integer, String> parentStatusMap) {
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
            // 新键一律追加在最后，与 Express 的 SELECT 列顺序一致（父评论为 null）
            map.put("parentStatus",
                    c.getParentId() == null ? null : parentStatusMap.get(c.getParentId()));
        }
        return map;
    }
}
