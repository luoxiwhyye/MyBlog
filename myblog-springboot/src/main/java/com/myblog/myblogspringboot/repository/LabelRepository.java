package com.myblog.myblogspringboot.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.myblog.myblogspringboot.entity.Label;

@Repository
public interface LabelRepository extends JpaRepository<Label, Integer> {

    /**
     * 名称是否已存在（列 collation 为 utf8mb4_unicode_ci，天然大小写不敏感、忽略尾空格）
     */
    boolean existsByLabelName(String labelName);

    /** 名称是否已被「其他」标签占用（更新时排除自身） */
    boolean existsByLabelNameAndIdNot(String labelName, Integer id);

    /**
     * 按名称模糊检索（忽略大小写），用于后台标签管理搜索。
     * 与 Express 端 `label_name LIKE %kw%` 行为对齐。
     */
    Page<Label> findByLabelNameContainingIgnoreCase(String keyword, Pageable pageable);

    /**
     * 标签下的「已发布」文章数（展示用）
     *
     * 必须与前台列表的口径一致：前台按 status='published' 拉取文章，
     * 若把草稿也算进去，就会出现「标签显示 N 篇、点进去是空列表」。
     * 删除保护请用 countLabelUsage（含草稿），两者不要合并。
     */
    @Query(value = "SELECT COUNT(*) FROM article_label al JOIN article a ON al.article_id = a.id " +
           "WHERE al.label_id = :labelId AND a.status = 'published' AND a.deleted_at IS NULL", nativeQuery = true)
    long countArticlesByLabelId(@Param("labelId") Integer labelId);

    @Query(value = "SELECT COUNT(*) FROM article_label WHERE label_id = :labelId", nativeQuery = true)
    long countLabelUsage(@Param("labelId") Integer labelId);
}
