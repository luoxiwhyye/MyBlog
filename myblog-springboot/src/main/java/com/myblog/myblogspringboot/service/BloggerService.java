package com.myblog.myblogspringboot.service;

import com.myblog.myblogspringboot.dto.LoginRequest;
import com.myblog.myblogspringboot.entity.Blogger;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.BloggerRepository;
import com.myblog.myblogspringboot.security.JwtTokenProvider;
import com.myblog.myblogspringboot.security.UserPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class BloggerService {

    private final BloggerRepository bloggerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

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
}
