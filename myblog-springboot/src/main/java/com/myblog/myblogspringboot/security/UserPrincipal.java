package com.myblog.myblogspringboot.security;

public class UserPrincipal {
    private final Integer id;
    private final String username;
    private final String nickname;
    private final String role;

    public UserPrincipal(Integer id, String username, String nickname, String role) {
        this.id = id;
        this.username = username;
        this.nickname = nickname;
        this.role = role;
    }

    public Integer getId() { return id; }
    public String getUsername() { return username; }
    public String getNickname() { return nickname; }
    public String getRole() { return role; }
}
