package com.myblog.myblogspringboot.service;

import java.util.ArrayList;
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

import com.myblog.myblogspringboot.dto.MessageBoardRequest;
import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.entity.MessageBoard;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.MessageBoardRepository;

import jakarta.persistence.criteria.Predicate;

@Service
public class MessageBoardService {

    private static final org.slf4j.Logger log =
            org.slf4j.LoggerFactory.getLogger(MessageBoardService.class);

    private final MessageBoardRepository messageBoardRepository;
    private final MessageNotifierService messageNotifier;

    public MessageBoardService(MessageBoardRepository messageBoardRepository,
                               MessageNotifierService messageNotifier) {
        this.messageBoardRepository = messageBoardRepository;
        this.messageNotifier = messageNotifier;
    }

    /**
     * 单层平铺留言：整体按 createAt 倒序分页
     */
    public PageResponse<Map<String, Object>> getMessages(int page, int pageSize,
                                                         String status, boolean isAdmin) {
        Pageable pageable = PageRequest.of(page - 1, pageSize,
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<MessageBoard> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            } else if (isAdmin) {
                predicates.add(cb.notEqual(root.get("status"), "deleted"));
            } else {
                predicates.add(cb.equal(root.get("status"), "approved"));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };

        Page<MessageBoard> messagePage = messageBoardRepository.findAll(spec, pageable);
        List<Map<String, Object>> list = messagePage.getContent().stream()
                .map(m -> toMap(m, isAdmin)).toList();

        return new PageResponse<>(list, messagePage.getTotalElements(), page, pageSize);
    }

    /**
     * 发布留言（访客免登录，默认 pending）
     */
    @Transactional
    public MessageBoard createMessage(MessageBoardRequest request, String authorIp) {
        if (request.getAuthorUrl() != null && !request.getAuthorUrl().isBlank()) {
            String urlPattern = "^https?://(?:www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$";
            if (!request.getAuthorUrl().matches(urlPattern)) {
                throw new BusinessException(400, "网址格式不正确");
            }
        }

        MessageBoard message = new MessageBoard();
        message.setAuthorName(request.getAuthorName());
        message.setAuthorEmail(request.getAuthorEmail());
        message.setAuthorUrl(request.getAuthorUrl());
        message.setAuthorIp(authorIp);
        message.setContent(request.getContent());
        message.setStatus("pending");
        // 访客显式勾选才为 true；未传 / null = 不接收
        message.setNotifyEmail(Boolean.TRUE.equals(request.getNotifyEmail()));
        MessageBoard saved = messageBoardRepository.save(message);

        // 异步通知博主（fire-and-forget，失败不影响主流程）
        try {
            messageNotifier.notifyBlogger(saved);
        } catch (Exception e) {
            // 通知失败仅记录，不影响留言
        }

        return saved;
    }

    @Transactional
    public void updateStatus(Integer id, String status) {
        // 状态只有三档：pending（待审核）/ approved（已审核）/ deleted（回收站）
        if (!List.of("approved", "pending", "deleted").contains(status)) {
            throw new BusinessException(400, "状态非法");
        }

        // ⚠️ 必须「load → 比对旧状态 → save」，不能走 repository 的直接 UPDATE：
        //    需要 previousStatus 才能判定幂等（只在「非 approved → approved」时发一次信），
        //    否则重复点「通过」会重复发邮件。
        //    （对标 Express controllers/messageBoardController.js 的 updateMessageStatus）
        MessageBoard message = messageBoardRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "留言不存在"));
        String previousStatus = message.getStatus();
        message.setStatus(status);
        messageBoardRepository.save(message);

        // 通知留言者本人「留言已通过审核」：
        // 留言板没有回复链路，这就是那个勾选框唯一的触发点。
        if ("approved".equals(status)
                && !"approved".equals(previousStatus)
                && Boolean.TRUE.equals(message.getNotifyEmail())) {
            Integer messageId = message.getId();
            CompletableFuture.runAsync(() -> {
                try {
                    notifyApprovedAfterReview(messageId);
                } catch (Exception e) {
                    log.error("[messageNotifier] 审核通知发送失败: {}", e.getMessage());
                }
            });
        }
    }

    /** 审核通过后通知留言者本人（收件人 = 留言者，与「新留言通知博主」是两封信）。 */
    private void notifyApprovedAfterReview(Integer messageId) {
        MessageBoard message = messageBoardRepository.findById(messageId).orElse(null);
        if (message == null) {
            return;
        }
        messageNotifier.notifyApproved(message);
    }

    @Transactional
    public void restore(Integer id) {
        // 走统一的 updateStatus（内部会 load → 比对旧状态 → save），避免两条状态写入路径
        updateStatus(id, "pending");
    }

    @Transactional
    public void delete(Integer id) {
        updateStatus(id, "deleted");
    }

    @Transactional
    public void hardDelete(Integer id) {
        messageBoardRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "留言不存在"));
        messageBoardRepository.deleteById(id);
    }

    private Map<String, Object> toMap(MessageBoard message) {
        return toMap(message, false);
    }

    /**
     * @param includeNotifyEmail 仅管理端为 true：「接收通知」是访客的订阅偏好，
     *                           公开列表没必要一并发出（与 Express 的 getMessages 一致）。
     *                           注意该键必须追加在最后，保证与 Express 的 JSON 键序一致。
     */
    private Map<String, Object> toMap(MessageBoard message, boolean includeNotifyEmail) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", message.getId());
        map.put("authorName", message.getAuthorName());
        map.put("authorEmail", message.getAuthorEmail());
        map.put("authorUrl", message.getAuthorUrl());
        map.put("authorIp", message.getAuthorIp());
        map.put("content", message.getContent());
        map.put("status", message.getStatus());
        map.put("createdAt", message.getCreatedAt());
        if (includeNotifyEmail) {
            map.put("notifyEmail", Boolean.TRUE.equals(message.getNotifyEmail()));
        }
        return map;
    }
}
