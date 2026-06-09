package com.myblog.myblogspringboot.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.myblog.myblogspringboot.entity.Type;

@Repository
public interface TypeRepository extends JpaRepository<Type, Integer> {

    @Query("SELECT COUNT(a) FROM Article a WHERE a.typeId = :typeId AND a.deletedAt IS NULL")
    long countArticlesByTypeId(@Param("typeId") Integer typeId);
}
