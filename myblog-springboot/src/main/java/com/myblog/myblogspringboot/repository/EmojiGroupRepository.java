package com.myblog.myblogspringboot.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.myblog.myblogspringboot.entity.EmojiGroup;

@Repository
public interface EmojiGroupRepository extends JpaRepository<EmojiGroup, Integer> {

    /** 按 sortOrder 升序，其次按 id 升序 */
    List<EmojiGroup> findAllByOrderBySortOrderAscIdAsc();
}
