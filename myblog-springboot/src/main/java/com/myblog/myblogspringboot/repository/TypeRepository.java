package com.myblog.myblogspringboot.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.myblog.myblogspringboot.entity.Type;

@Repository
public interface TypeRepository extends JpaRepository<Type, Integer> {

    /**
     * 名称是否已存在（列 collation 为 utf8mb4_unicode_ci，天然大小写不敏感、忽略尾空格）
     */
    boolean existsByTypeName(String typeName);

    /** 名称是否已被「其他」分类占用（更新时排除自身） */
    boolean existsByTypeNameAndIdNot(String typeName, Integer id);

    /**
     * 分类下的「已发布」文章数（展示用）
     *
     * 必须与前台列表的口径一致：前台按 status='published' 拉取文章，
     * 若把草稿也算进去，就会出现「分类显示 N 篇、点进去是空列表」。
     * 删除保护请用 countAnyArticlesByTypeId（含草稿），两者不要合并。
     */
    @Query("SELECT COUNT(a) FROM Article a WHERE a.typeId = :typeId AND a.status = 'published' AND a.deletedAt IS NULL")
    long countArticlesByTypeId(@Param("typeId") Integer typeId);

    /**
     * 分类下的文章数（含草稿，删除保护专用）
     *
     * 刻意把草稿也算在内：某分类只要有草稿就不应被删除，否则草稿会失去归属。
     */
    @Query("SELECT COUNT(a) FROM Article a WHERE a.typeId = :typeId AND a.deletedAt IS NULL")
    long countAnyArticlesByTypeId(@Param("typeId") Integer typeId);
}
