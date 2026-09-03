package com.myblog.myblogspringboot.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.myblog.myblogspringboot.entity.MessageBoard;

@Repository
public interface MessageBoardRepository
        extends JpaRepository<MessageBoard, Integer>, JpaSpecificationExecutor<MessageBoard> {

    @Modifying
    @Query("UPDATE MessageBoard m SET m.status = :status WHERE m.id = :id")
    int updateStatus(@Param("id") Integer id, @Param("status") String status);

    long countByStatus(String status);
}
