package com.myblog.myblogspringboot.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.myblog.myblogspringboot.dto.SearchItemDTO;
import com.myblog.myblogspringboot.entity.Article;

@Repository
public interface ArticleRepository extends JpaRepository<Article, Integer>, JpaSpecificationExecutor<Article> {

    @Query("SELECT a FROM Article a LEFT JOIN FETCH a.type LEFT JOIN FETCH a.labels WHERE a.id = :id AND a.deletedAt IS NULL")
    Optional<Article> findByIdWithDetails(@Param("id") Integer id);

    @Query("SELECT a FROM Article a LEFT JOIN FETCH a.type LEFT JOIN FETCH a.labels WHERE a.id = :id")
    Optional<Article> findByIdWithDetailsIncludingDeleted(@Param("id") Integer id);

    @Query("SELECT COALESCE(SUM(a.viewCount), 0) FROM Article a WHERE a.deletedAt IS NULL")
    long getTotalViewCount();

    @Query(value = "SELECT DATE(a.created_at) as date, COUNT(*) as count FROM article a " +
           "WHERE a.deleted_at IS NULL AND (:scope = 'all' OR a.status = :scope) " +
           "AND a.created_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY) " +
           "GROUP BY DATE(a.created_at) ORDER BY date ASC", nativeQuery = true)
    java.util.List<Object[]> getPublishTrend(@Param("days") int days, @Param("scope") String scope);

    @Query(value = "SELECT t.id, t.type_name, COUNT(a.id) as count FROM type t " +
           "LEFT JOIN article a ON a.type_id = t.id AND a.deleted_at IS NULL " +
           "AND (:scope = 'all' OR a.status = :scope) " +
           "GROUP BY t.id, t.type_name ORDER BY count DESC, t.id ASC", nativeQuery = true)
    java.util.List<Object[]> getTypeDistribution(@Param("scope") String scope);

    @Modifying
    @Query("UPDATE Article a SET a.viewCount = a.viewCount + 1 WHERE a.id = :id")
    void incrementViewCount(@Param("id") Integer id);

    @Modifying
    @Query("UPDATE Article a SET a.deletedAt = CURRENT_TIMESTAMP WHERE a.id = :id AND a.deletedAt IS NULL")
    int softDelete(@Param("id") Integer id);

    @Modifying
    @Query("UPDATE Article a SET a.deletedAt = NULL WHERE a.id = :id AND a.deletedAt IS NOT NULL")
    int restore(@Param("id") Integer id);

    /**
     * 批量更新文章状态（对标 Express models/Article.updateArticlesStatus）。
     *
     * <p>用 native 而非 JPQL：既保持与 Express 完全一致的 SQL（{@code updated_at = NOW()}、
     * 只作用于未软删文章），也避免 JPQL 批量更新绕过 @PreUpdate 的语义差异。
     */
    @Modifying
    @Query(value = "UPDATE article SET status = :status, updated_at = NOW() "
         + "WHERE id IN (:ids) AND deleted_at IS NULL", nativeQuery = true)
    int updateStatusByIds(@Param("ids") Collection<Integer> ids, @Param("status") String status);

    /**
     * 按 ID 批量取轻量展示字段（Meilisearch 命中后回表；顺序由调用方按命中顺序重排）
     */
    @Query("SELECT new com.myblog.myblogspringboot.dto.SearchItemDTO(a.id, a.title, a.summary, a.coverImage, a.createdAt, t.typeName) "
         + "FROM Article a LEFT JOIN a.type t "
         + "WHERE a.id IN :ids AND a.deletedAt IS NULL AND a.status = 'published'")
    List<SearchItemDTO> findBriefByIds(@Param("ids") Collection<Integer> ids);

    /**
     * 关键词模糊匹配（Meilisearch 不可用时的降级路径）
     */
    @Query("SELECT new com.myblog.myblogspringboot.dto.SearchItemDTO(a.id, a.title, a.summary, a.coverImage, a.createdAt, t.typeName) "
         + "FROM Article a LEFT JOIN a.type t "
         + "WHERE a.deletedAt IS NULL AND a.status = 'published' "
         + "AND (LOWER(a.title) LIKE LOWER(CONCAT('%', :keyword, '%')) "
         + "OR LOWER(a.summary) LIKE LOWER(CONCAT('%', :keyword, '%')) "
         + "OR LOWER(a.content) LIKE LOWER(CONCAT('%', :keyword, '%'))) "
         + "ORDER BY a.createdAt DESC")
    List<SearchItemDTO> searchBrief(@Param("keyword") String keyword, Pageable pageable);

    /**
     * 相关推荐候选：按「共享标签 ×2 + 同分类 ×1」评分，只取正分，按 得分 / 热度 / 时间 排序。
     *
     * <p>⚠️ labelIds 为空时调用方必须传入哨兵值（如 [-1]），否则 Hibernate 会展开成非法的 IN ()。
     * <p>返回两列：[articleId, relevanceScore]，需由调用方按返回顺序回表并组 DTO。
     */
    @Query(value = "SELECT a.id AS article_id, "
         + "(SUM(CASE WHEN al.label_id IN (:labelIds) THEN 1 ELSE 0 END) * 2 "
         + "+ (CASE WHEN a.type_id = :typeId THEN 1 ELSE 0 END)) AS relevance_score "
         + "FROM article a "
         + "LEFT JOIN article_label al ON a.id = al.article_id "
         + "WHERE a.deleted_at IS NULL AND a.status = 'published' AND a.id <> :id "
         + "GROUP BY a.id "
         + "HAVING relevance_score > 0 "
         + "ORDER BY relevance_score DESC, a.view_count DESC, a.created_at DESC, a.id DESC "
         + "LIMIT :limit", nativeQuery = true)
    List<Object[]> findRelatedScoredIds(@Param("id") Integer id,
                                        @Param("labelIds") List<Integer> labelIds,
                                        @Param("typeId") Integer typeId,
                                        @Param("limit") int limit);

    /**
     * 按 id 批量取带 type / labels 的文章（相关推荐回表用；避免 N+1）
     */
    @Query("SELECT DISTINCT a FROM Article a LEFT JOIN FETCH a.type LEFT JOIN FETCH a.labels "
         + "WHERE a.id IN :ids AND a.deletedAt IS NULL")
    List<Article> findAllWithDetailsByIds(@Param("ids") Collection<Integer> ids);

    /**
     * 上一篇：小于当前 id 的最近一篇已发布文章
     */
    @Query("SELECT a FROM Article a LEFT JOIN FETCH a.type "
         + "WHERE a.deletedAt IS NULL AND a.status = 'published' AND a.id < :id ORDER BY a.id DESC")
    List<Article> findPublishedBefore(@Param("id") Integer id, Pageable pageable);

    /**
     * 下一篇：大于当前 id 的最近一篇已发布文章
     */
    @Query("SELECT a FROM Article a LEFT JOIN FETCH a.type "
         + "WHERE a.deletedAt IS NULL AND a.status = 'published' AND a.id > :id ORDER BY a.id ASC")
    List<Article> findPublishedAfter(@Param("id") Integer id, Pageable pageable);
}
