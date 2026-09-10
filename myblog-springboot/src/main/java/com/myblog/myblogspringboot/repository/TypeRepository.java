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

    @Query("SELECT COUNT(a) FROM Article a WHERE a.typeId = :typeId AND a.deletedAt IS NULL")
    long countArticlesByTypeId(@Param("typeId") Integer typeId);
}
