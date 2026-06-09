package com.myblog.myblogspringboot.service;

import com.myblog.myblogspringboot.repository.ArticleRepository;
import com.myblog.myblogspringboot.repository.CommentRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class DashboardService {

    private final ArticleRepository articleRepository;
    private final CommentRepository commentRepository;

    public DashboardService(ArticleRepository articleRepository, CommentRepository commentRepository) {
        this.articleRepository = articleRepository;
        this.commentRepository = commentRepository;
    }

    public Map<String, Object> getStats() {
        long totalArticles = articleRepository.count(
                (root, query, cb) -> cb.isNull(root.get("deletedAt")));

        long totalComments = commentRepository.count(
                (root, query, cb) -> cb.notEqual(root.get("status"), "deleted"));

        long totalViews = articleRepository.getTotalViewCount();

        long pendingComments = commentRepository.count(
                (root, query, cb) -> cb.equal(root.get("status"), "pending"));

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalArticles", totalArticles);
        stats.put("totalComments", totalComments);
        stats.put("totalViews", totalViews);
        stats.put("pendingComments", pendingComments);

        return stats;
    }

    public Map<String, Object> getCharts(int days, String scope) {
        int clampedDays = Math.max(7, Math.min(90, days));
        String effectiveScope = "all".equals(scope) ? "all" : "published";

        List<Object[]> trendRows = articleRepository.getPublishTrend(clampedDays, effectiveScope);

        List<String> dates = buildDateRange(clampedDays);
        Map<String, Long> trendMap = new LinkedHashMap<>();
        for (Object[] row : trendRows) {
            trendMap.put(row[0].toString(), ((Number) row[1]).longValue());
        }

        List<Map<String, Object>> publishTrend = new ArrayList<>();
        for (String date : dates) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("date", date);
            item.put("count", trendMap.getOrDefault(date, 0L));
            publishTrend.add(item);
        }

        List<Object[]> distRows = articleRepository.getTypeDistribution(effectiveScope);
        List<Map<String, Object>> typeDistribution = new ArrayList<>();
        for (Object[] row : distRows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("typeId", ((Number) row[0]).intValue());
            item.put("typeName", row[1] != null ? row[1].toString() : "");
            item.put("articleCount", ((Number) row[2]).longValue());
            typeDistribution.add(item);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("scope", effectiveScope);
        result.put("articlePublishTrend", publishTrend);
        result.put("typeDistribution", typeDistribution);
        return result;
    }

    private List<String> buildDateRange(int days) {
        List<String> dates = new ArrayList<>();
        LocalDate today = LocalDate.now();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        for (int i = days - 1; i >= 0; i--) {
            dates.add(today.minusDays(i).format(fmt));
        }
        return dates;
    }
}
