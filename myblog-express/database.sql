-- 创建数据库
CREATE DATABASE IF NOT EXISTS myblog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE myblog;

-- 分类表
CREATE TABLE IF NOT EXISTS type (
  id INT PRIMARY KEY AUTO_INCREMENT,
  typeName VARCHAR(100) NOT NULL UNIQUE COMMENT '分类名称',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_name (typeName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 标签表
CREATE TABLE IF NOT EXISTS label (
  id INT PRIMARY KEY AUTO_INCREMENT,
  labelName VARCHAR(100) NOT NULL UNIQUE COMMENT '标签名称',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_name (labelName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 文章表
CREATE TABLE IF NOT EXISTS article (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL COMMENT '文章标题',
  summary TEXT COMMENT '文章摘要',
  content LONGTEXT NOT NULL COMMENT '文章内容',
  coverImage VARCHAR(255) COMMENT '封面图片URL',
  typeId INT NOT NULL COMMENT '分类ID',
  status VARCHAR(50) DEFAULT 'draft' COMMENT '文章状态: draft/published',
  viewCount INT DEFAULT 0 COMMENT '浏览次数',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deletedAt TIMESTAMP NULL COMMENT '删除时间（软删除）',
  FOREIGN KEY (typeId) REFERENCES type(id),
  INDEX idx_type (typeId),
  INDEX idx_status (status),
  INDEX idx_created (createdAt),
  INDEX idx_deleted (deletedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 文章标签关联表
CREATE TABLE IF NOT EXISTS article_label (
  id INT PRIMARY KEY AUTO_INCREMENT,
  articleId INT NOT NULL COMMENT '文章ID',
  labelId INT NOT NULL COMMENT '标签ID',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_article_label (articleId, labelId),
  FOREIGN KEY (articleId) REFERENCES article(id) ON DELETE CASCADE,
  FOREIGN KEY (labelId) REFERENCES label(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 评论表
CREATE TABLE IF NOT EXISTS comment (
  id INT PRIMARY KEY AUTO_INCREMENT,
  articleId INT NOT NULL COMMENT '所属文章ID',
  parentId INT COMMENT '回复的评论ID（NULL表示顶级评论）',
  authorName VARCHAR(100) NOT NULL COMMENT '评论者名称',
  authorEmail VARCHAR(100) NOT NULL COMMENT '评论者邮箱',
  content TEXT NOT NULL COMMENT '评论内容',
  status VARCHAR(50) DEFAULT 'pending' COMMENT '状态: pending/approved/spam/deleted',
  likeCount INT DEFAULT 0 COMMENT '点赞数',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (articleId) REFERENCES article(id) ON DELETE CASCADE,
  FOREIGN KEY (parentId) REFERENCES comment(id) ON DELETE CASCADE,
  INDEX idx_article (articleId),
  INDEX idx_parent (parentId),
  INDEX idx_status (status),
  INDEX idx_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 博主表
CREATE TABLE IF NOT EXISTS blogger (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL UNIQUE COMMENT '用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码（bcrypt加密）',
  email VARCHAR(100) COMMENT '邮箱',
  avatar VARCHAR(255) COMMENT '头像URL',
  bio TEXT COMMENT '个人简介',
  role VARCHAR(50) DEFAULT 'admin' COMMENT '角色: admin',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 网站配置表
CREATE TABLE IF NOT EXISTS setting (
  id INT PRIMARY KEY AUTO_INCREMENT,
  settingKey VARCHAR(100) NOT NULL UNIQUE COMMENT '配置key',
  settingValue LONGTEXT COMMENT '配置value',
  settingType VARCHAR(50) DEFAULT 'text' COMMENT '类型: text/image',
  description VARCHAR(255) COMMENT '配置描述',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_key (settingKey)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认配置（可选）
INSERT IGNORE INTO setting (settingKey, settingValue, settingType, description) VALUES
('site_name', '我的博客', 'text', '网站名称'),
('site_description', '记录技术点滴，分享编程心得', 'text', '网站描述'),
('site_logo', '', 'image', '网站logo'),
('site_favicon', '', 'image', '网站favicon'),
('posts_per_page', '10', 'text', '每页文章数'),
('comments_per_page', '10', 'text', '每页评论数'),
('enable_comments', '1', 'text', '是否启用评论');
