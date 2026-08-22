package com.myblog.myblogspringboot.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.myblog.myblogspringboot.entity.FriendLink;

@Repository
public interface FriendLinkRepository extends JpaRepository<FriendLink, Integer> {

    /** 仅查询启用(状态=1)的友链，置顶优先、点击次数其次（公开列表用） */
    @Query("SELECT f FROM FriendLink f WHERE f.status = true ORDER BY f.isSticky DESC, f.clickCount DESC, f.id ASC")
    Page<FriendLink> findEnabled(Pageable pageable);

    /** 查询全部（管理端用），置顶优先 */
    @Query("SELECT f FROM FriendLink f ORDER BY f.isSticky DESC, f.clickCount DESC, f.id ASC")
    Page<FriendLink> findAllOrdered(Pageable pageable);

    /** 仅查询启用友链总数 */
    @Query("SELECT COUNT(f) FROM FriendLink f WHERE f.status = true")
    long countEnabled();

    /** 递增点击次数 */
    @Modifying
    @Query("UPDATE FriendLink f SET f.clickCount = f.clickCount + 1 WHERE f.id = :id")
    int incrementClickCount(@Param("id") Integer id);
}
