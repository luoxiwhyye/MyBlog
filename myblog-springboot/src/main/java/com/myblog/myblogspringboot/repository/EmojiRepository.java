package com.myblog.myblogspringboot.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.myblog.myblogspringboot.entity.Emoji;

@Repository
public interface EmojiRepository
        extends JpaRepository<Emoji, Integer>, JpaSpecificationExecutor<Emoji> {

    /** 公开：所有启用表情，按 sortOrder 升序 */
    List<Emoji> findByEnabledOrderBySortOrderAscIdAsc(Integer enabled);

    /** 统计某分组下的表情数量 */
    long countByGroupId(Integer groupId);

    /** 把某分组下的表情全部退回未分组（删组时调用） */
    @Modifying
    @Query("UPDATE Emoji e SET e.groupId = null WHERE e.groupId = :groupId")
    int clearGroupRef(@Param("groupId") Integer groupId);
}
