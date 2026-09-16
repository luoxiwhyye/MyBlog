package com.myblog.myblogspringboot.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import com.myblog.myblogspringboot.entity.MessageBoard;

@Repository
public interface MessageBoardRepository
        extends JpaRepository<MessageBoard, Integer>, JpaSpecificationExecutor<MessageBoard> {

    // 注：状态更新一律走 MessageBoardService.updateStatus（load → 比对旧状态 → save），
    //    不再提供「直接 UPDATE 不读旧值」的仓储方法 —— 那种写法无法判定幂等，
    //    会让「留言审核通过通知留言者」重复发信。

    long countByStatus(String status);
}
