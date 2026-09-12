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
}
