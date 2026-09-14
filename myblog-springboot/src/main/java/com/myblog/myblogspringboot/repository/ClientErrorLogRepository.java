package com.myblog.myblogspringboot.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.myblog.myblogspringboot.entity.ClientErrorLog;

@Repository
public interface ClientErrorLogRepository extends JpaRepository<ClientErrorLog, Long> {

    /** 按错误类型（title）过滤，对标 Express getList 的 filters.type */
    Page<ClientErrorLog> findByTitle(String title, Pageable pageable);

    /**
     * 清空全部错误日志，返回删除行数（对标 Express clearAll 的 affectedRows）。
     * ⚠️ 不能用 deleteAllInBatch()：它返回 void，拿不到受影响行数。
     */
    @Modifying
    @Query("DELETE FROM ClientErrorLog l")
    int deleteAllRows();
}
