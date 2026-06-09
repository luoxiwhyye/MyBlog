package com.myblog.myblogspringboot.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.myblog.myblogspringboot.entity.Setting;

@Repository
public interface SettingRepository extends JpaRepository<Setting, String> {

    Optional<Setting> findBySettingKey(String key);
}
