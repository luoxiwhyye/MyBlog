package com.myblog.myblogspringboot.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.myblog.myblogspringboot.dto.ErrorLogDTO;
import com.myblog.myblogspringboot.dto.ErrorLogRequest;
import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.entity.ClientErrorLog;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.ClientErrorLogRepository;

/**
 * 前端错误监控上报服务（对标 Express controllers/clientErrorLogController.js）。
 *
 * 只做长度截断，不落敏感信息。
 */
@Service
@Transactional(readOnly = true)
public class ClientErrorLogService {

    private static final int MAX_MESSAGE_LEN = 2000;

    private final ClientErrorLogRepository repository;

    public ClientErrorLogService(ClientErrorLogRepository repository) {
        this.repository = repository;
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return "";
        }
        return value.length() > max ? value.substring(0, max) : value;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    /**
     * 接收前端错误上报（公开；限流由 RateLimitFilter 控制）。返回新日志 id。
     */
    @Transactional
    public Long createErrorLog(ErrorLogRequest request) {
        String title = truncate(request.getTitle(), 120);
        String message = truncate(request.getMessage(), MAX_MESSAGE_LEN);

        if (isBlank(message) && isBlank(title)) {
            throw new BusinessException(400, "缺少错误信息");
        }

        ClientErrorLog log = new ClientErrorLog();
        log.setTitle(title);
        log.setMessage(message);
        log.setSource(truncate(request.getSource(), 500));
        log.setLine(request.getLine());
        log.setCol(request.getCol());
        log.setUrl(truncate(request.getUrl(), 500));
        log.setComponent(truncate(request.getComponent(), 200));
        log.setUa(truncate(request.getUa(), 500));

        return repository.save(log).getId();
    }

    /**
     * 获取错误日志列表（管理员）。type 过滤走 title 精确匹配（与 Express 一致）。
     */
    public PageResponse<ErrorLogDTO> getErrorLogs(int page, int pageSize, String type) {
        int safePage = Math.max(1, page);
        int safePageSize = Math.max(1, Math.min(100, pageSize));

        Pageable pageable = PageRequest.of(safePage - 1, safePageSize,
                Sort.by(Sort.Direction.DESC, "occurredAt").and(Sort.by(Sort.Direction.DESC, "id")));

        Page<ClientErrorLog> result = (type == null || type.isBlank())
                ? repository.findAll(pageable)
                : repository.findByTitle(type, pageable);

        List<ErrorLogDTO> list = result.getContent().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());

        return new PageResponse<>(list, result.getTotalElements(), safePage, safePageSize);
    }

    /**
     * 清空错误日志（管理员），返回删除行数。
     */
    @Transactional
    public int clearAll() {
        return repository.deleteAllRows();
    }

    private ErrorLogDTO toDTO(ClientErrorLog log) {
        ErrorLogDTO dto = new ErrorLogDTO();
        dto.setId(log.getId());
        dto.setTitle(log.getTitle());
        dto.setMessage(log.getMessage());
        dto.setSource(log.getSource());
        dto.setLine(log.getLine());
        dto.setCol(log.getCol());
        dto.setUrl(log.getUrl());
        dto.setComponent(log.getComponent());
        dto.setUa(log.getUa());
        dto.setOccurredAt(log.getOccurredAt());
        return dto;
    }
}
