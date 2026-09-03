package com.myblog.myblogspringboot.service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.myblog.myblogspringboot.dto.AccountRequest;
import com.myblog.myblogspringboot.dto.LoginRequest;
import com.myblog.myblogspringboot.entity.Blogger;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.BloggerRepository;
import com.myblog.myblogspringboot.security.JwtTokenProvider;
import com.myblog.myblogspringboot.security.UserPrincipal;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Service
public class BloggerService {

    private final BloggerRepository bloggerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    // 用于重置账户时按外键顺序清空全部业务表
    @PersistenceContext
    private EntityManager entityManager;

    public BloggerService(BloggerRepository bloggerRepository,
                          PasswordEncoder passwordEncoder,
                          JwtTokenProvider jwtTokenProvider) {
        this.bloggerRepository = bloggerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    public Map<String, Object> login(LoginRequest request) {
        Blogger blogger = bloggerRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BusinessException(401, "用户名或密码错误"));

        if (!passwordEncoder.matches(request.getPassword(), blogger.getPasswordHash())) {
            throw new BusinessException(401, "用户名或密码错误");
        }

        UserPrincipal principal = new UserPrincipal(
                blogger.getId(), blogger.getUsername(),
                blogger.getNickname(), blogger.getRole() != null ? blogger.getRole() : "admin"
        );

        String token = jwtTokenProvider.generateToken(principal);

        Map<String, Object> bloggerInfo = new LinkedHashMap<>();
        bloggerInfo.put("id", blogger.getId());
        bloggerInfo.put("username", blogger.getUsername());
        bloggerInfo.put("nickname", blogger.getNickname());
        bloggerInfo.put("email", blogger.getEmail());
        bloggerInfo.put("avatar", blogger.getAvatar());
        bloggerInfo.put("bio", blogger.getBio());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("token", token);
        result.put("blogger", bloggerInfo);
        return result;
    }

    public Blogger getProfile(Integer id) {
        return bloggerRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "博主信息不存在"));
    }

    public Map<String, Object> getPublicProfile() {
        Blogger blogger = bloggerRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new BusinessException(404, "博主信息不存在"));

        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("id", blogger.getId());
        profile.put("nickname", blogger.getNickname());
        profile.put("avatar", blogger.getAvatar());
        profile.put("bio", blogger.getBio());
        profile.put("createdAt", blogger.getCreatedAt());
        return profile;
    }

    @Transactional
    public void updateProfile(Integer id, String email, String nickname, String bio, String avatar) {
        Blogger blogger = bloggerRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "博主信息不存在"));

        if (email != null) blogger.setEmail(email);
        if (nickname != null) blogger.setNickname(nickname);
        if (bio != null) blogger.setBio(bio);
        if (avatar != null) blogger.setAvatar(avatar);

        bloggerRepository.save(blogger);
    }

    @Transactional
    public void changePassword(Integer id, String oldPassword, String newPassword) {
        Blogger blogger = bloggerRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "博主信息不存在"));

        if (!passwordEncoder.matches(oldPassword, blogger.getPasswordHash())) {
            throw new BusinessException(401, "旧密码错误");
        }

        blogger.setPasswordHash(passwordEncoder.encode(newPassword));
        bloggerRepository.save(blogger);
    }

    /** 是否已存在任意博主账号（用于登录页判断是否显示初始化表单） */
    public boolean exists() {
        return bloggerRepository.count() > 0;
    }

    /** 初始化管理员账号（仅当尚无任何账号时允许，已存在则拒绝） */
    @Transactional
    public void init(AccountRequest request) {
        if (bloggerRepository.count() > 0) {
            throw new BusinessException(409, "博主账号已存在，拒绝再次初始化");
        }
        createAdmin(request);
    }

    /** 重置账户：清空全部业务数据并重建管理员（危险操作） */
    @Transactional
    public void reset(AccountRequest request) {
        if (bloggerRepository.count() == 0) {
            throw new BusinessException(400, "尚未初始化账号，无需重置");
        }
        clearAllBusinessData();
        createAdmin(request);
    }

    /** 按外键依赖顺序清空全部业务表（先子表后父表） */
    private void clearAllBusinessData() {
        String[] tables = {
            "article_label",
            "comment",
            "article",
            "friend_link",
            "label",
            "type",
            "setting",
            "blogger",
        };
        for (String table : tables) {
            entityManager.createNativeQuery("DELETE FROM `" + table + "`").executeUpdate();
        }
    }

    /** 用账号请求重建管理员（Bcrypt 加密密码） */
    private void createAdmin(AccountRequest request) {
        Blogger blogger = new Blogger();
        blogger.setUsername(request.getUsername());
        blogger.setNickname(
                (request.getNickname() == null || request.getNickname().isBlank())
                        ? request.getUsername() : request.getNickname());
        blogger.setEmail(request.getEmail() == null ? "" : request.getEmail());
        blogger.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        blogger.setRole("admin");
        bloggerRepository.save(blogger);
    }
}
