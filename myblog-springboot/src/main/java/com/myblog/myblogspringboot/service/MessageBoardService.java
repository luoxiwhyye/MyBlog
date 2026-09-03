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

import com.myblog.myblogspringboot.dto.MessageBoardRequest;
import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.entity.MessageBoard;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.MessageBoardRepository;

import jakarta.persistence.criteria.Predicate;

@Service
public class MessageBoardService {

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
                .map(this::toMap).toList();

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
        if (!List.of("approved", "pending", "spam", "deleted").contains(status)) {
            throw new BusinessException(400, "状态非法");
        }
        messageBoardRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "留言不存在"));
        messageBoardRepository.updateStatus(id, status);
    }

    @Transactional
    public void restore(Integer id) {
        messageBoardRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "留言不存在"));
        messageBoardRepository.updateStatus(id, "pending");
    }

    @Transactional
    public void delete(Integer id) {
        messageBoardRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "留言不存在"));
        messageBoardRepository.updateStatus(id, "deleted");
    }

    @Transactional
    public void hardDelete(Integer id) {
        messageBoardRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "留言不存在"));
        messageBoardRepository.deleteById(id);
    }

    private Map<String, Object> toMap(MessageBoard message) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", message.getId());
        map.put("authorName", message.getAuthorName());
        map.put("authorEmail", message.getAuthorEmail());
        map.put("authorUrl", message.getAuthorUrl());
        map.put("authorIp", message.getAuthorIp());
        map.put("content", message.getContent());
        map.put("status", message.getStatus());
        map.put("createdAt", message.getCreatedAt());
        return map;
    }
}
