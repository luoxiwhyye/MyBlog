package com.myblog.myblogspringboot.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.myblog.myblogspringboot.entity.Label;

@Repository
public interface LabelRepository extends JpaRepository<Label, Integer> {

    @Query(value = "SELECT COUNT(*) FROM article_label al JOIN article a ON al.article_id = a.id " +
           "WHERE al.label_id = :labelId AND a.deleted_at IS NULL", nativeQuery = true)
    long countArticlesByLabelId(@Param("labelId") Integer labelId);

    @Query(value = "SELECT COUNT(*) FROM article_label WHERE label_id = :labelId", nativeQuery = true)
    long countLabelUsage(@Param("labelId") Integer labelId);
}
