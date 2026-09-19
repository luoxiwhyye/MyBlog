# MyBlog 小白部署教程（零基础版）

> 这份教程假设你：没写过代码、没用过 Linux、没听说过 Docker。
> 照着做完，你会得到：**一个自己能打开、也能发给朋友看的博客网站**，外加一个写文章用的**管理后台**。
>
> 全程只需要「复制、粘贴、回车」。凡是**需要你自己动手改**的地方，都会用 `【需要修改】` 标出来。

---

## 目录

- [第 0 步　先搞懂：我们到底在做什么](#第-0-步-先搞懂我们到底在做什么)
- [第 1 步　选一条路](#第-1-步-选一条路)
- [第 2 步　装 Docker](#第-2-步-装-docker)
- [路线 A：只在自己电脑上跑起来（约 30 分钟）](#路线-a只在自己电脑上跑起来约-30-分钟)
- [路线 B：部署到云服务器，让所有人都能访问（约 1 小时）](#路线-b部署到云服务器让所有人都能访问约-1-小时)
- [第 3 步　绑定自己的域名 + 开 HTTPS（可选，但推荐）](#第-3-步-绑定自己的域名-开-https可选但推荐)
- [部署完怎么用：写第一篇文章](#部署完怎么用写第一篇文章)
- [日常维护（每周花 2 分钟）](#日常维护每周花-2-分钟)
- [出问题了？对照表](#出问题了对照表)
- [附录 A　命令速查表](#附录-a-命令速查表)
- [附录 B　名词对照表（看不懂就来查）](#附录-b-名词对照表看不懂就来查)
- [最后 上线后的安全检查清单](#最后上线后的安全检查清单)

> 如果你已经会用 Docker 和 Linux 命令行，这份文档对你来说太啰嗦了。
> 请直接看 [`DEPLOY-GUIDE.md`](./DEPLOY-GUIDE.md)（现行部署指南），
> 或 [`DEPLOY.md`](./DEPLOY.md)（简版）。

---

## 第 0 步　先搞懂：我们到底在做什么

### 1. 这个项目由 4 个「零件」组成

MyBlog 不是一个单纯的网页文件，它由 4 个部分配合工作，就像一家餐厅：

| 零件 | 名字 | 它像餐厅里的谁 | 作用 |
| ---- | ---- | -------------- | ---- |
| 数据库 | MySQL | 仓库 | 存文章、评论、用户 |
| 后端 | Express（Node.js） | 厨师 | 按前台的请求，从仓库取货、加工 |
| 博客前台 | Nuxt | 前厅 / 菜单 | 访客看到的页面 |
| 管理后台 | Vue | 办公室 | 你写文章、传图片、管评论的地方 |

另外还有 3 个「帮手」：Redis（加速缓存）、Meilisearch（搜索）、backup（自动备份）。

**好消息是：这 7 个东西会被一次装好、一次启动，你不需要逐个安装配置。**

### 2. 「部署」到底是什么意思

- 在你自己的电脑上打开网页文件，只有你自己看得到，关掉电脑就没了。
- **部署 = 把这套程序放到一台 24 小时不关机的电脑上，并给它一个网址，这样谁都能访问。**

这台 24 小时开机的电脑，就叫**服务器**（一般是云服务商机房里的一台机器，你租一段时间）。

### 3. Docker 是什么，为什么要用它

Docker 就像给每个零件发了一个**密封的保温箱**：

- 箱子里装好了这个零件需要的所有东西（软件版本、配置），不依赖你电脑上装了什么。
- 箱子之间互不干扰，删掉重来很干净。
- 一个命令就能把 7 个箱子一起摆好、一起开火。

所以本教程**不需要你安装 Node.js、MySQL、Redis、Java**，只要装一个 Docker 就够了。

---

## 第 1 步　选一条路

| 路线 | 适合谁 | 花多久 | 结果 |
| ---- | ------ | ------ | ---- |
| **路线 A**：只在自己电脑上跑 | 想先看看长什么样、改改试试 | 约 30 分钟 | 只有你自己能看（`http://localhost:3001`） |
| **路线 B**：部署到云服务器 | 想让朋友也能访问、想真的上线 | 约 1 小时 | 谁都能访问（`http://你的服务器IP:3001`） |
| 推荐做法 | 先跑 A 熟悉一下，成功了再走 B | — | 出错时更容易定位问题 |

> 只想炫耀给朋友看，又怕麻烦？路线 B 是必须的，但你**可以先不做域名和 HTTPS**，
> 用「服务器 IP + 端口」就能访问，后面随时补上。

---

## 第 2 步　装 Docker

### 2.1 如果你在 Windows 电脑上（路线 A 必做）

1. 打开官网下载页：<https://www.docker.com/products/docker-desktop/>
2. 点 **Download for Windows**，下载 `Docker Desktop Installer.exe`。
3. 双击安装，一路点 **OK / Next / Install**，安装器默认会勾选
   「Use WSL 2 instead of Hyper-V」，保持默认即可。
4. 安装完**重启电脑**（必须）。
5. 重启后启动 **Docker Desktop**（开始菜单里搜 Docker），
   等左下角那个小圆点从黄色变成**绿色**，并显示 **Engine running**。
6. 验证：按 `Win + X`，选「终端」或「Windows PowerShell」，输入下面这行后回车：

   ```powershell
   docker --version
   ```

   看到类似 `Docker version 27.x.x, build xxxxx` 就成功了。

   再输入：

   ```powershell
   docker compose version
   ```

   看到 `Docker Compose version v2.x.x` 就可以了。

**卡住了怎么办**

| 现象 | 处理 |
| ---- | ---- |
| 提示 `WSL 2 installation is incomplete` | 用**管理员**身份打开 PowerShell，运行 `wsl --install`，然后重启电脑 |
| 提出「需要开启虚拟化」 | 重启电脑进 BIOS（一般开机按 F2/Del），把 `Virtualization Technology` 设为 Enabled |
| 提示 `error during connect` | Docker Desktop 还没启动。打开它，等变绿再重试 |

### 2.2 如果你要部署到云服务器（路线 B 必做）

买服务器时优先选**自带的 Docker 应用镜像**，就不用手动装了：

- 阿里云 / 腾讯云 →「轻量应用服务器」→ 创建时镜像选择 **Ubuntu 24.04** 或
  **应用镜像 / Docker**。省钱又省事。

如果买到的服务器没有预装 Docker，登录服务器后（登录方式见路线 B 第 2 步）依次运行：

```bash
# 一键安装 Docker（官方脚本）
curl -fsSL https://get.docker.com | bash

# 开机自动启动
systemctl enable --now docker

# 验证
docker --version
docker compose version
```

> 如果上面这条命令卡住超过 5 分钟没反应，说明网络到 Docker 官方源太慢。
> 最快的解决办法是**删掉这台服务器重新买一台**，镜像直接选「Docker」。

### 2.3 配置国内镜像加速（可选，但强烈建议）

默认从国外下载软件镜像可能非常慢。按下面步骤换成国内加速地址：

**Windows（Docker Desktop）**：打开 Docker Desktop → 右上角齿轮 **Settings** →
左侧 **Docker Engine** → 在右侧 JSON 里加入下面这一行（注意上一行末尾要有逗号）：

```json
"registry-mirrors": ["https://docker.m.daocloud.io", "https://mirror.ccs.tencentyun.com"]
```

点 **Apply & restart**。

**Linux 服务器**：把下面整段复制粘贴进终端回车：

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "registry-mirrors": ["https://docker.m.daocloud.io", "https://mirror.ccs.tencentyun.com"]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```

---

## 路线 A：只在自己电脑上跑起来（约 30 分钟）

### A1. 把项目代码放到电脑上

1. 拿到项目文件夹（如果是从代码仓库下载的，解压出来）。
2. 确认里面**直接就有** `docker-compose.yml` 和 `.env.docker.example` 这两个文件。
   如果点进去还有一层同名文件夹，就把里面那层剪切到外面。

> 记住这个文件夹的路径，例如 `D:\vscode-project\myblog`。下面说的「项目文件夹」都是指它。

### A2. 创建配置文件

配置文件就是告诉程序「密码是什么、用哪个端口」的清单。

1. 打开项目文件夹，在**地址栏**里输入 `pwsh` 然后回车（会在该文件夹打开命令行）。
2. 粘贴执行：

   ```powershell
   Copy-Item .env.docker.example .env.docker
   ```

3. 用记事本打开它：

   ```powershell
   notepad .env.docker
   ```

> 也可以用鼠标操作：把 `.env.docker.example` 复制一份，改名成 `.env.docker`，
> 右键 → 打开方式 → 记事本。**不要用 Word 打开**。

### A3. 修改密码和地址（重要）

在记事本里找到下面这几行，把等号后面的内容换成你自己的（后面不要留空格）：

```
DB_PASSWORD=your-strong-password-here          【需要修改】改成你自己的数据库密码
JWT_SECRET=change-me-to-a-random-string-...    【需要修改】改成随机长串
MEILI_MASTER_KEY=meili-master-key-change-me    【需要修改】改成随机长串
```

**随机长串怎么来？** 在 PowerShell 里粘贴这一行，回车后就会打印一串随机字符，
复制它粘到配置文件里（三处各生成一次，互相不要相同）：

```powershell
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 40 | ForEach-Object {[char]$_})
```

密码要求：**16 位以上、字母数字混合**。别用 `123456`、`admin`、`password` 这类。

顺便把这一行的邮箱也改成你自己的（不改也能跑，只是收不到评论通知邮件）：

```
BLOGGER_EMAIL=admin@example.com                【需要修改】换成你自己的邮箱
```

**还有一处地址必须改**，否则管理后台能打开页面、但一登录就转圈：

```
VITE_API_BASE=http://myblog-backend:3000/api/v1
```

把它改成：

```
VITE_API_BASE=http://localhost:3000/api/v1     【需要修改】
```

原因：这一项是**你的浏览器要访问的后端地址**，而 `myblog-backend` 只是几个程序在内部
互相称呼时用的名字，浏览器不认识它。

改完后 **保存（Ctrl+S）并关闭记事本**。

> 本地试玩时，其余带 `localhost` 的项（`SITE_URL`、`NUXT_SITE_URL`、`FRONTEND_ORIGIN`、
> `ADMIN_ORIGIN`）**保持默认不要动**。
> 唯一的例外是 `NUXT_API_BASE`：**它必须保持 `myblog-backend` 不变**（那是程序内部通信用的）。
>
> 另外，打开网页请统一用 `http://localhost:3001` 这种写法，
> **不要换成 `http://127.0.0.1:3001`**。两者看着一样，但在程序眼里不是一个地址，混用会让后台登录失败。

### A4. 一条命令启动

回到刚才的命令行窗口，粘贴执行：

```powershell
cd D:\vscode-project\myblog
docker compose --env-file .env.docker up -d --build
```

- 第一次会下载和构建，**大约 3 到 8 分钟**，屏幕会滚很多英文，这是正常的。
- 只要最后没有大段红色报错、并且命令正常结束（回到 `>` 提示符），就是成功了。

> 中途如果想中断，按 `Ctrl + C`。重新运行上面的命令会接着做，不会白干。

### A5. 检查是否都起来了

```powershell
docker compose ps
```

你会看到一张表，正常情况下每行的 `STATUS` 都是 `Up` 或 `Up (healthy)`：

```
NAME                STATUS
myblog-mysql        Up (healthy)
myblog-redis        Up (healthy)
myblog-meilisearch  Up (healthy)
myblog-backend      Up
myblog-blog         Up
myblog-admin        Up
myblog-backup       Up
```

如果某个是 `Restarting` 或 `Exited`，先别急，看
[出问题了 对照表](#出问题了对照表)。

> 数据库里的表、以及默认的博主账号，会在**第一次启动时自动创建**。
> 你不需要去找 SQL 文件，也不需要手动导入任何数据。

### A6. 打开看看

在浏览器里依次访问：

| 打开什么 | 网址 | 应该看到 |
| -------- | ---- | -------- |
| 博客前台 | <http://localhost:3001> | 博客首页 |
| 管理后台 | <http://localhost:3002> | 登录页 |

**登录后台**：

| 用户名 | 密码 |
| ------ | ---- |
| `admin` | `admin123` |

> ⚠️ **更好的做法：在第一次启动之前**就把 `.env.docker` 里的 `BLOGGER_PASSWORD` 改成强口令 ——
> 它只在「创建博主」时生效（本次是空库首启，正好用得上）；`admin123` 等同于没有密码，
> `node scripts/preflight.mjs` 会把它列为阻断项。
>
> **若已经用默认口令启动了**：第一件事就是改密码（右上角头像 → 个人资料 → 修改密码），
> 顺便把邮箱改成你自己的（用于接收评论通知）。

到此，路线 A 完成。想让它出现在手机上、给朋友看，继续走路线 B。

---

## 路线 B：部署到云服务器，让所有人都能访问（约 1 小时）

### B1. 买一台服务器

| 项目 | 怎么选 |
| ---- | ------ |
| 商家 | 阿里云 / 腾讯云 的「轻量应用服务器」（对新手最友好，控制台简单） |
| 配置 | **2 核 4G**（2 核 2G 也能跑，但构建时容易卡住） |
| 系统镜像 | **Ubuntu 24.04 LTS**，如果列表里有 Docker 应用镜像，优先选它 |
| 磁盘 | 40G 以上 |
| 带宽 | 3M 以上（个人博客够用） |
| 时长 | 按年买最划算，新用户常有一年几十到一百多元的活动 |

买完后，在控制台记下 **3 样东西**（后面一直要用）：

1. **公网 IP**（形如 `123.45.67.89`）
2. **root 密码**（创建时自己设的，或控制台里重置）
3. 所在**地域**（离你和读者近一点，国内一般是华东/华南）

### B2. 放行端口（很多人卡在这里）

云服务器默认只开了很少的端口，必须手动放行，否则网页打不开。

在云控制台找到 **「防火墙」**（腾讯云叫防火墙，阿里云叫安全组），添加下面的**入站规则**：

| 端口 | 用途 | 是否必须 |
| ---- | ---- | -------- |
| `22` | 远程登录服务器 | 必须 |
| `80` | 普通网页（HTTP） | 必须 |
| `443` | 加密网页（HTTPS） | 做域名时用 |
| `3001` | 博客前台（IP 直连时访问） | 先用 IP 访问时要开 |
| `3002` | 管理后台（IP 直连时访问） | 先用 IP 访问时要开 |
| `3000` | 后端接口（IP 直连时访问） | 先用 IP 访问时要开 |

> 等域名和 HTTPS 都配好之后，可以把 `3000/3001/3002` 关掉，只留 `22/80/443`，更安全。

### B3. 登录服务器

两种方式，任选：

**方式一（不用装软件）**：在云服务器控制台找到「登录 / 远程连接 / 网页终端」，
点开就是一个黑色的命令行窗口，可以在里面敲命令。
缺点：闲置一会儿会断开，构建的时候别关这个页面。

**方式二（推荐，更稳）**：Windows 按 `Win + R` 输入 `powershell` 回车，然后：

```powershell
ssh root@你的服务器IP
```

第一次会问 `Are you sure you want to continue connecting?`，输入 `yes` 回车，
再输入密码（**输入密码时屏幕上不会显示任何字符，这是正常现象**），回车即可。
看到 `root@xxx:~#` 说明登录成功。

> 如果提示 `Connection refused`，先检查安全组是否放行了 `22`，以及 IP 是否抄错。

### B4. 把项目代码上传到服务器

在服务器上建一个目录：

```bash
mkdir -p /opt/myblog
```

然后从**你自己的电脑**把整个项目文件夹传上去。推荐用 **WinSCP**（免费图形化工具）：

1. 下载安装 WinSCP，新建连接：协议 `SFTP`，主机填服务器 IP，用户名 `root`，密码填服务器密码。
2. 左侧是「你的电脑」，右侧是「服务器」。右侧进入 `/opt/myblog`。
3. 把项目文件夹里的**所有内容**（包括 `docker-compose.yml`）拖到右侧。
4. 等待传输完成。

> 有几个必须传上去的东西容易被漏掉：`.env.docker.example`、`docker-compose.yml`、
> `scripts/`、`myblog-express/`、`myblog-vue/`、`myblog-springboot/`。
> **整个文件夹全部传，不要挑着传。**
> 另外，传输时不要传 `node_modules`（如果有的话），它是本地的缓存，服务器会自己生成。

传完后，回到服务器命令行确认一下：

```bash
ls /opt/myblog
```

应该能看到 `docker-compose.yml`。如果看到的是 `/opt/myblog/myblog/docker-compose.yml`，
说明多套了一层，用下面这条修正：

```bash
mv /opt/myblog/myblog/* /opt/myblog/
```

### B5. 给服务器加一块「虚拟内存」（2 核 4G 建议做）

构建前端时比较吃内存，加一块 2G 虚拟内存能避免半夜卡死：

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### B6. 创建配置文件并修改

```bash
cd /opt/myblog
cp .env.docker.example .env.docker
nano .env.docker
```

`nano` 是服务器上最简单的文本编辑器：用**方向键**移动光标，直接打字修改。
改完后依次按 `Ctrl + O`、回车（保存）、`Ctrl + X`（退出）。

**需要修改的地方（把 `你的服务器IP` 换成真实的公网 IP）：**

```
DB_PASSWORD=你的强密码                              【需要修改】
JWT_SECRET=一串随机长字符                           【需要修改】
MEILI_MASTER_KEY=一串随机长字符                     【需要修改】
BLOGGER_EMAIL=yourname@qq.com                      【需要修改】换成你自己的邮箱

SITE_URL=http://你的服务器IP:3001                   【需要修改】邮件里的链接前缀
SITE_NAME=我的博客                                  【需要修改】站点名

NUXT_SITE_URL=http://你的服务器IP:3001              【需要修改】
VITE_API_BASE=http://你的服务器IP:3000/api/v1       【需要修改】
APP_BASE_URL=http://你的服务器IP:3000               【需要修改】新上传图片的地址前缀
FRONTEND_ORIGIN=http://你的服务器IP:3001            【需要修改】
ADMIN_ORIGIN=http://你的服务器IP:3002               【需要修改】
```

`NUXT_API_BASE` **保持原样不要动**（它是容器内部互通的地址，改成公网 IP 反而会出错）。

**服务器上生成随机长串**，运行一次复制一串，运行三次取三串不同的：

```bash
openssl rand -hex 32
```

> 只改密码不改 IP 也行，但那样打开网页时图片和接口会加载不出来（被浏览器跨域拦截），
> 所以上面 6 个带 IP 的地址**建议一次改到位**。

### B7. 启动

```bash
cd /opt/myblog
docker compose --env-file .env.docker up -d --build
```

- 首次构建 **3 到 10 分钟**，视服务器性能和网速而定。
- 中间会滚大量英文日志，只要没有连续的大段红字报错就不用管。
- 用网页终端的朋友注意：**这段时间千万别关页面**。真断了也不要紧，重新登录后再跑一遍同样的命令，已完成的部分会复用。

### B8. 检查状态

```bash
docker compose ps
```

全部是 `Up` 或 `Up (healthy)` 就成功了。再验证一下后端活着：

```bash
curl http://127.0.0.1:3000/health
```

返回一段 JSON（例如 `{"code":200,...}`）就说明后端没问题。

### B9. 用浏览器访问

| 打开什么 | 网址 |
| -------- | ---- |
| 博客前台 | `http://你的服务器IP:3001` |
| 管理后台 | `http://你的服务器IP:3002` |

登录后台：`admin` / `admin123`，**登录后立刻在「个人资料」里改密码和邮箱**。

> **此刻你已经有一个公网可访问的博客了**，可以把 `http://你的服务器IP:3001` 发给朋友。
> 唯一不足是没有 HTTPS（浏览器地址栏会提示「不安全」），
> 想解决就继续做下一步；不做也不影响使用。

---

## 第 3 步　绑定自己的域名 + 开 HTTPS（可选，但推荐）

有域名之后，网址会从 `http://123.45.67.89:3001` 变成 `https://blog.example.com`，
看起来正规，而且地址栏会有一把小锁（加密传输，密码不会被窃听）。

### 3.1 买域名

在阿里云 / 腾讯云买一个域名（`.com` 一年几十元，`.cn` 更便宜），需要**实名认证**，等 1 天左右生效。

### 3.2 加两条解析记录

在域名控制台找到「解析设置」，添加**两条**记录（主机记录不同，记录值相同）：

| 记录类型 | 主机记录 | 记录值 |
| -------- | -------- | ------ |
| `A` | `blog` | 你的服务器公网 IP |
| `A` | `admin` | 你的服务器公网 IP |

> 为什么要给后台单独一个域名？这不是讲究，而是**只能用这种方式**：
> 这个后台程序的资源地址是 `/assets/...`、页面路由前缀是 `/admin/...`，
> 只有挂在**域名根**下才能正常工作。硬塞进 `blog.example.com/admin` 会页面空白、样式全丢。
> 想用主域名也可以，把 `blog` 改成 `@`。

保存后等 5 到 30 分钟生效。验证方法：在服务器上运行

```bash
ping -c 2 blog.example.com     # 两个域名都试一下
```

能显示你的服务器 IP 就说明解析好了。

### 3.3 安装 Nginx 和 HTTPS 工具

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 3.4 写两份网站入口配置

**（1）博客前台**：

```bash
sudo nano /etc/nginx/sites-available/myblog-blog
```

把下面整段粘进去（**把 `blog.example.com` 换成你的博客域名**）：

```nginx
server {
    listen 80;
    server_name blog.example.com;

    client_max_body_size 20m;

    # 博客程序自己会代理接口和图片，这里整体转发即可
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection        "";
    }
}
```

**（2）管理后台**：

```bash
sudo nano /etc/nginx/sites-available/myblog-admin
```

（**把 `admin.example.com` 换成你的后台域名**）：

```nginx
server {
    listen 80;
    server_name admin.example.com;

    client_max_body_size 20m;

    # 后台调接口走这里（同一个域名，不用管跳域）
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 上传的图片
    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection        "";
    }
}
```

两份都保存退出（`Ctrl + O`、回车、`Ctrl + X`），然后启用它们：

```bash
sudo ln -sf /etc/nginx/sites-available/myblog-blog  /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/myblog-admin /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t                 # 看到 syntax is ok 才算成功
sudo systemctl reload nginx
```

> 不想手写？项目里已经带了一份同样结构的完整模板（多出了 SSL、压缩、缓存等生产配置），
> 把域名和证书路径改掉就能用：
>
> ```bash
> sudo cp /opt/myblog/nginx.conf /etc/nginx/sites-available/myblog
> sudo ln -sf /etc/nginx/sites-available/myblog /etc/nginx/sites-enabled/myblog
> ```

此时用浏览器访问 `http://你的博客域名` 应该已经能看到博客了。

### 3.5 申请免费 HTTPS 证书

```bash
sudo certbot --nginx -d blog.example.com
sudo certbot --nginx -d admin.example.com
```

每条命令按提示操作：

1. 输入邮箱（证书过期时收提醒用）；
2. 输入 `A` 同意条款；
3. 问是否把 HTTP 跳转到 HTTPS，选 `2`（Redirect，推荐）。

完成后，访问 `https://你的博客域名` 与 `https://你的后台域名`，地址栏出现小锁即成功。
证书会自动续期，不用管。

### 3.6 把配置里的地址换成域名并重新构建

```bash
cd /opt/myblog
nano .env.docker
```

把这几行改成域名版本（**推荐直接走 Nginx，所以接口地址用 `/api/v1` 相对路径**）：

```
SITE_URL=https://blog.example.com                         【需要修改】
NUXT_SITE_URL=https://blog.example.com                    【需要修改】
VITE_API_BASE=/api/v1                                     【需要修改】
APP_BASE_URL=https://blog.example.com                     【需要修改】
FRONTEND_ORIGIN=https://blog.example.com                  【需要修改】
ADMIN_ORIGIN=https://admin.example.com                    【需要修改】后台域名
SITE_NAME=我的博客                                         【需要修改】
```

然后**重新构建前台和后台**（前端地址是构建时写死的，改配置必须重建）：

```bash
docker compose --env-file .env.docker build myblog-blog myblog-admin
docker compose --env-file .env.docker up -d
```

等 3 到 8 分钟。完成后：

| 打开什么 | 网址 |
| -------- | ---- |
| 博客前台 | `https://blog.example.com` |
| 管理后台 | `https://admin.example.com` |

最后回到云控制台，把安全组里的 `3000 / 3001 / 3002` 删掉，只留 `22 / 80 / 443`，更安全。

---

## 部署完怎么用：写第一篇文章

**不需要重新部署**，登录后台直接写就行：

1. 打开 `https://admin.example.com`（或 `http://你的IP:3002`）；
2. 输入用户名密码登录；
3. 左侧菜单 → **文章管理** → **写文章**；
4. 标题、正文、封面图填好，点**发布**；
5. 回到博客前台刷新，文章就出现了。

顺便在**系统设置**里把站点名称、头像、页脚信息改掉，这些都不需要重启程序。

**关于评论通知邮件**（可选）：如果你想让「有人评论时发邮件通知你」，
需要配置 SMTP 邮箱信息：编辑 `/opt/myblog/.env.docker`，填好 `SMTP_HOST`、`SMTP_PORT`、
`SMTP_USER`、`SMTP_PASS`（注意：是邮箱的**授权码**，不是登录密码），
然后重启后端：

```bash
cd /opt/myblog
docker compose --env-file .env.docker up -d
docker compose restart myblog-backend
```

不配也没关系，评论功能本身照常工作。

---

## 日常维护（每周花 2 分钟）

### 查看运行状态

```bash
cd /opt/myblog
docker compose ps
```

全是 `Up` 就没事。

### 看某个服务的日志（排查问题用）

```bash
docker compose logs --tail=100 myblog-backend    # 最近 100 行后端日志
docker compose logs -f myblog-backend            # 实时滚动，按 Ctrl+C 退出
```

### 重启

```bash
docker compose restart              # 全部重启
docker compose restart myblog-backend   # 只重启后端
```

### 备份（重要）

系统里有 `myblog-backup` 这个容器，**每天凌晨 2 点自动备份数据库**，自动保留最近 14 天。

手动立刻备份一次：

```bash
docker compose exec myblog-backup bash /scripts/backup.sh
```

查看已有备份文件：

```bash
docker compose exec myblog-backup ls -lh /backups
```

恢复某一份备份（`CONFIRM=1` 表示确认，会覆盖当前数据，谨慎使用）：

```bash
docker compose exec myblog-backup bash -c "CONFIRM=1 bash /scripts/restore.sh /backups/备份文件名.sql.gz"
```

> 强烈建议：**偶尔真的恢复一次试试**，确认备份是可用的。
> 很多人第一次用备份，就是数据丢的那天。

### 清理磁盘（每月一次）

反复构建会产生很多垃圾镜像，磁盘会悄悄被占满：

```bash
docker system prune -af
docker volume ls | grep myblog     # 看看数据卷还在不在（不要删它们）
```

> 注意：**不要**运行 `docker compose down -v`，`-v` 会连数据库一起删掉，数据不可恢复。

### 更新到新版本代码

```bash
cd /opt/myblog
# 用 WinSCP 把新代码覆盖上传，然后：
docker compose --env-file .env.docker up -d --build
```

只改了前端页面时，可以只重建那两个：

```bash
docker compose --env-file .env.docker build myblog-blog myblog-admin
docker compose --env-file .env.docker up -d
```

---

## 出问题了？对照表

### 通用排查三步

```bash
cd /opt/myblog
docker compose ps                          # 1. 谁没起来
docker compose logs --tail=200 myblog-backend   # 2. 它说了什么错（换成出问题的服务名）
curl http://127.0.0.1:3000/health          # 3. 后端活着吗
```

### 常见症状

| 症状 | 最可能的原因 | 怎么办 |
| ---- | ------------ | ------ |
| `docker compose` 提示不是命令 | Docker 没装好 / Compose v2 缺失 | 重装 Docker；确认用 `docker compose`（中间是空格）而不是 `docker-compose` |
| `error during connect` | Docker 服务没启动 | Windows：打开 Docker Desktop 等变绿；服务器：`sudo systemctl start docker` |
| 浏览器打不开网页 | 端口没放行 | 回云控制台检查安全组放了 `3001/3002`；服务器本机 `curl http://127.0.0.1:3001` 先确认程序在跑 |
| 网页能开但一直转圈 / 数据加载失败 | `.env.docker` 里的 IP 或域名没改对 | 检查 `VITE_API_BASE`、`FRONTEND_ORIGIN`、`ADMIN_ORIGIN`、`SITE_URL`，改完**必须重新构建** |
| 后台登录提示登录失败 | 账号密码不对 | 默认 `admin` / `admin123`；已改过就重置数据库或新库重建 |
| `myblog-mysql` 一直不 healthy | 首次初始化较慢，或密码含特殊字符 | 等 1 分钟；避免密码里出现 `$`、`&`、`#` 等符号 |
| 构建中途显示 `Killed` | 内存不足（2 核 4G 常见） | 执行 B5 加虚拟内存；或先 `docker compose stop meilisearch` 再构建 |
| 改动代码后页面没变 | 前端地址是构建时写死的 | 重新 `build` 对应服务，再 `up -d`，不要只 `restart` |
| 上传图片失败 | 超过 10MB 限制 | 换小一点的图，或改 Nginx 的 `client_max_body_size` |
| 时间显示差 8 小时 | 时区没对齐 | 确认 `.env.docker` 里 `TZ=Asia/Shanghai`、`DB_TIME_ZONE=+08:00` 两行没被改动 |
| 磁盘满了 | Docker 缓存堆积 | `docker system prune -af` |
| 评论通知邮件收不到 | SMTP 没配或邮箱是占位地址 | 后台「个人资料」改成真实邮箱；`.env.docker` 填 SMTP 四项后重启后端 |

### 实在搞不定

把这三样发出来求助（不要发密码）：

```bash
cd /opt/myblog
docker compose ps
docker compose logs --tail=100 myblog-backend
cat .env.docker        # 发之前把密码那几行删掉
```

---

## 附录 A　命令速查表

在项目目录下执行（服务器上是 `/opt/myblog`）。

| 我想做什么 | 命令 |
| ---------- | ---- |
| 启动 / 首次安装 | `docker compose --env-file .env.docker up -d --build` |
| 只启动（不重建） | `docker compose --env-file .env.docker up -d` |
| 看状态 | `docker compose ps` |
| 看日志 | `docker compose logs -f myblog-backend` |
| 重启 | `docker compose restart` |
| 停止（保留数据） | `docker compose stop` |
| 全部停掉并删除容器（保留数据） | `docker compose down` |
| 更新代码后重建 | `docker compose --env-file .env.docker up -d --build` |
| 手动备份数据库 | `docker compose exec myblog-backup bash /scripts/backup.sh` |
| 清理磁盘 | `docker system prune -af` |
| 检查 Nginx 配置 | `sudo nginx -t` |
| 重启 Nginx | `sudo systemctl reload nginx` |
| 看服务器磁盘 | `df -h` |
| 看服务器内存 | `free -h` |

Windows 本地专用：

| 我想做什么 | 命令 |
| ---------- | ---- |
| 在项目文件夹打开命令行 | 地址栏输入 `pwsh` 回车 |
| 复制配置文件 | `Copy-Item .env.docker.example .env.docker` |
| 用记事本编辑 | `notepad .env.docker` |
| 生成随机密码 | `-join ((48..57)+(65..90)+(97..122) \| Get-Random -Count 40 \| ForEach-Object {[char]$_})` |

---

## 附录 B　名词对照表（看不懂就来查）

| 名词 | 大白话解释 |
| ---- | ---------- |
| 服务器 | 一台放在机房里、24 小时不关机的电脑，你租来跑自己的程序 |
| 公网 IP | 服务器在网络上的门牌号，形如 `123.45.67.89` |
| 域名 | 给 IP 起的好记名字，例如 `blog.example.com` |
| 端口 | 同一台机器上的「房间号」：3000 是后端、3001 是前台、3002 是后台 |
| 安全组 / 防火墙 | 服务器的门禁，没放行的端口外面进不来 |
| SSH | 远程登录服务器的命令行方式 |
| Docker | 把程序连运行环境一起打包的工具，免去逐个安装软件 |
| 容器 | Docker 跑起来的一个「程序的盒子」，一台服务器上可以并排跑好几个 |
| 镜像 | 容器的安装包 / 模板 |
| Docker Compose | 一份配置文件，负责一次管好这好几个容器 |
| 构建（build） | 把代码「编译打包」成能运行的镜像，第一次最慢 |
| 数据卷（Volume） | 装在容器外面、不会被容器删除影响的数据目录，相当于「保险柜」 |
| Nginx | 网站的「前台接待」，负责把访客的请求分发给对应服务 |
| HTTPS / 证书 | 给网页通信加密，浏览器地址栏的小锁就代表它 |
| 环境变量 / `.env` | 一份放配置的清单（密码、端口、网址都在里面），改完一般要重启或重建才生效 |
| SSR | 服务端渲染，指网页内容在服务器上就先拼好再发给浏览器，利于搜索收录 |
| CORS | 浏览器的跨域安全策略；前台访问的域名必须写在 `FRONTEND_ORIGIN` / `ADMIN_ORIGIN` 里 |
| health / healthy | 健康检查，表示这个服务确认自己能正常工作 |

---

## 最后：上线后的安全检查清单

> 下面是速查版。**正式上线前建议按 [DEPLOY.md 「上线前检查清单」](./DEPLOY.md#上线前检查清单) 逐条过**
> （30+ 条，标了哪些是阻断项、哪些只能在服务器上做），并用仓库自带的三个脚本收口：
> `node scripts/preflight.mjs`（配置自检）、`node scripts/smoke.mjs`（上线后冒烟）、
> `bash scripts/backup-uploads.sh`（图片备份）。

- [ ] 管理后台默认密码 `admin123` **已修改**
- [ ] `.env.docker` 里 `DB_PASSWORD` / `JWT_SECRET` / `MEILI_MASTER_KEY` **都不是默认值**
- [ ] 博主邮箱已改成真实邮箱（否则评论通知会退信）
- [ ] 用域名时已开启 HTTPS
- [ ] 安全组只开 `22 / 80 / 443`（不再需要 IP 直连时，删掉 3000-3002）
- [ ] 数据库自动备份在跑，且**实际恢复演练过一次**
- [ ] 服务器 root 密码足够强，没和别人共享
