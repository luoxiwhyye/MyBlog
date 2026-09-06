package com.myblog.myblogspringboot.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import com.myblog.myblogspringboot.entity.Emoji;

@Repository
public interface EmojiRepository
        extends JpaRepository<Emoji, Integer>, JpaSpecificationExecutor<Emoji> {

    /** 公开：所有启用表情，按 sortOrder 升序 */
    List<Emoji> findByEnabledOrderBySortOrderAscIdAsc(Integer enabled);
}
