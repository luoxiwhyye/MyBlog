package com.myblog.myblogspringboot.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.myblog.myblogspringboot.entity.Blogger;

@Repository
public interface BloggerRepository extends JpaRepository<Blogger, Integer> {

    Optional<Blogger> findByUsername(String username);

    Optional<Blogger> findByEmail(String email);

    Optional<Blogger> findFirstByOrderByIdAsc();
}
