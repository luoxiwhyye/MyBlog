package com.myblog.myblogspringboot.controller;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.myblog.myblogspringboot.dto.ApiResponse;
import com.myblog.myblogspringboot.entity.Blogger;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.BloggerRepository;
import com.myblog.myblogspringboot.service.MailService;

/**
 * 邮件通知配置状态与测试发信（管理员，对标 Express routes/mailRoutes.js）。
 *
 * <p>背景：4 类通知的代码早已完成，但 SMTP 未配置时 MailService 只打日志就降级 ——
 * 前台 / 后台都看不出「没生效」。本控制器把「配置状态」与「真实发一封」暴露出来，
 * 供后台「系统设置 · 邮件通知」面板使用。
 *
 * <p>响应字段与 Express controllers/mailController.js 逐项对齐。
 */
@RestController
@RequestMapping("/api/v1/mail")
public class MailController {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final MailService mailService;
    private final BloggerRepository bloggerRepository;

    @Value("${app.site-name:MyBlog}")
    private String siteName;

    @Value("${app.site-url:}")
    private String siteUrl;

    public MailController(MailService mailService, BloggerRepository bloggerRepository) {
        this.mailService = mailService;
        this.bloggerRepository = bloggerRepository;
    }

    /**
     * 通知邮件的实际收件人 = 博主邮箱
     *
     * <p>取值口径与 CommentNotifierService / MessageNotifierService 的通知路径一致，
     * 所以面板上显示的收件人就是「评论 / 留言通知真正会发到哪」。
     */
    private String recipientEmail() {
        return bloggerRepository.findFirstByOrderByIdAsc()
                .map(Blogger::getEmail)
                .orElse("");
    }

    /**
     * GET /api/v1/mail/status
     * 返回 SMTP 配置状态与收件人（不发信，不探测连通性）
     */
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> status() {
        Map<String, Object> data = new LinkedHashMap<>(mailService.getStatus());
        data.put("recipient", recipientEmail());
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * POST /api/v1/mail/test
     * 用当前 SMTP 配置真实发一封测试邮件
     *
     * <p>body: { "to": "..." } —— 省略则发给博主邮箱
     */
    @PostMapping("/test")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendTestMail(
            @RequestBody(required = false) Map<String, Object> body) {
        Object rawTo = body == null ? null : body.get("to");
        String to = rawTo == null ? "" : String.valueOf(rawTo).trim();
        if (to.isEmpty()) {
            to = recipientEmail();
        }

        if (to.isEmpty()) {
            throw new BusinessException(400, "缺少收件人：请填写邮箱，或先在「个人资料」里设置博主邮箱");
        }
        if (!EMAIL_PATTERN.matcher(to).matches()) {
            throw new BusinessException(400, "邮箱格式不正确");
        }

        Map<String, Object> status = mailService.getStatus();
        if (!"ok".equals(status.get("status"))) {
            throw new BusinessException(400, "邮件服务未启用（" + status.get("reason")
                    + "）：请在后端 .env 配置 SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS 后重启服务");
        }

        String html = buildTestHtml();
        MailService.SendResult result = mailService.sendMailDetailed(
                to, "【测试】" + siteName + " 邮件通知", html);

        if (!result.ok()) {
            throw new BusinessException(400, "发送失败：" + (result.error() == null ? "未知错误" : result.error()));
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("to", to);
        return ResponseEntity.ok(ApiResponse.success(data, "测试邮件已发送至 " + to));
    }

    private String buildTestHtml() {
        String link = siteUrl == null || siteUrl.isBlank()
                ? ""
                : "<p><a href=\"" + siteUrl + "\" style=\"color:#475569;font-weight:600;\">" + siteUrl + "</a></p>";
        return """
            <div style="max-width:600px;margin:0 auto;font-family:'PingFang SC','Microsoft YaHei',sans-serif;background:#f7f8fa;padding:24px;">
              <div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6ebf2;">
                <div style="background:linear-gradient(135deg,#475569,#1e293b);padding:20px 28px;">
                  <h2 style="margin:0;color:#ffffff;font-size:18px;">测试邮件</h2>
                </div>
                <div style="padding:24px 28px;color:#334155;line-height:1.8;font-size:14px;">
                  <p>这是一封来自后台「系统设置 · 邮件通知」的测试邮件。</p>
                  <p>收到它说明 SMTP 配置可用，评论 / 回复 / 留言的邮件通知已能正常发出。</p>
                  %s
                </div>
                <div style="padding:14px 28px;background:#f8fafc;color:#94a3b8;font-size:12px;text-align:center;">
                  本邮件由 %s 自动发送，请勿直接回复。
                </div>
              </div>
            </div>
            """.formatted(link, siteName);
    }
}
