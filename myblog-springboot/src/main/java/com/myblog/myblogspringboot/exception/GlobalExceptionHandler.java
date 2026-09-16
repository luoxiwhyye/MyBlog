package com.myblog.myblogspringboot.exception;

import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.myblog.myblogspringboot.dto.ApiResponse;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException ex) {
        log.warn("业务异常: {}", ex.getMessage());
        return ResponseEntity.status(ex.getCode())
                .body(ApiResponse.error(ex.getCode(), ex.getMessage()));
    }

    /**
     * 「无 handler」的请求不要落到兜底的 500。
     *
     * Spring 对没有映射的路径会在静态资源解析阶段抛 NoResourceFoundException；
     * 若交给 {@link #handleException(Exception)} 会变成 500 + 堆栈日志，排查极不友好。
     * 这里改成 404，与 Express app.js 末尾的 404 中间件响应体一致。
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResourceFound(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(404, "请求的资源不存在"));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(400, message));
    }

    /**
     * 请求体解析失败（JSON 语法错 / 类型对不上，如布尔字段收到字符串）不要落到兜底的 500。
     *
     * 这是**客户端**错误：Express 侧同类输入由 express-validator 拦成 400，
     * Spring 若返回 500 会让双端对「错误请求」的契约不一致（也把客户端错误计入了错误率指标）。
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadableBody(HttpMessageNotReadableException ex) {
        log.warn("请求体无法解析: {}", ex.getMessage());
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(400, "请求体格式不正确"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception ex) {
        log.error("服务器内部错误", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(500, "服务器内部错误"));
    }
}
