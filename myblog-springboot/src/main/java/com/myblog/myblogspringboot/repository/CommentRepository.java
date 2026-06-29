package com.myblog.myblogspringboot.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.myblog.myblogspringboot.entity.Comment;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Integer>, JpaSpecificationExecutor<Comment> {

    List<Comment> findByParentIdAndStatusOrderByCreatedAtAsc(Integer parentId, String status);

    List<Comment> findByParentIdInAndStatusOrderByCreatedAtAsc(List<Integer> parentIds, String status);

    @Modifying
    @Query("UPDATE Comment c SET c.status = :status WHERE c.id IN :ids")
    int updateStatusByIds(@Param("ids") List<Integer> ids, @Param("status") String status);

    @Query("SELECT c.id FROM Comment c WHERE c.parentId IN :parentIds")
    List<Integer> findIdsByParentIdIn(@Param("parentIds") List<Integer> parentIds);

    @Modifying
    @Query("UPDATE Comment c SET c.likeCount = c.likeCount + 1 WHERE c.id = :id")
    int incrementLikeCount(@Param("id") Integer id);
}
