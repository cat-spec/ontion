## 第2章 环境与快速开始

### 核心知识点

> 本章聚焦「把 Docker 跑起来」这一目标，覆盖安装、验证、第一条命令、镜像加速与清理。理解 Desktop 与 Engine 的差异，是后续排查所有环境问题的基础。

**Docker Desktop**
- 概念解释：Docker 官方面向开发者的一体化桌面应用，把 Docker Engine、Docker CLI、Compose、BuildKit、Kubernetes（可选）打包成一个图形化安装包，内部通过一个轻量虚拟机运行 Linux 容器。
- 核心作用：让 Mac/Windows 用户无需手动配置 Linux 内核即可获得完整容器体验，统一了不同操作系统的开发体验。
- 基本用法：
  ```bash
  # Mac/Windows 安装后直接使用
  docker version
  docker run -d -p 8080:80 nginx
  ```
- 注意事项：Docker Desktop 在大型企业（≥250 员工）商业使用需付费订阅；Mac 上默认使用 Apple Virtualization Framework 或 QEMU 作为后端，M 系列芯片运行 amd64 镜像需通过 `--platform linux/amd64` 模拟，性能有损耗。

**Docker Engine（服务器版）**
- 概念解释：纯粹的容器运行时与服务端组件，包含 `dockerd` 守护进程、containerd、runc，无 GUI、无桌面集成，是 Linux 服务器上的标准安装方式。
- 核心作用：在生产服务器、CI Runner 上以最小依赖提供容器能力，资源占用低、启动快、行为可预期。
- 基本用法：
  ```bash
  # Ubuntu/Debian 一键安装（官方脚本）
  curl -fsSL https://get.docker.com | sudo sh
  sudo systemctl enable --now docker
  sudo usermod -aG docker $USER   # 免 sudo，需重新登录生效
  ```
- 注意事项：仅支持 Linux；与 Docker Desktop 不能在同一台机器同时安装（Linux Desktop 也会冲突）；版本分为 `stable` 和 `test` 通道，生产应锁版本。

**各平台安装差异**
- 概念解释：Mac 通过 Hypervisor.framework 启动一个 LinuxKit VM；Windows 依赖 WSL2 后端运行 Linux 内核；Linux 原生直接调用内核 cgroup/namespace，无虚拟化层。
- 核心作用：理解差异有助于排查「为什么 Linux 上正常，Mac 上慢」「为什么 WSL2 磁盘占用暴涨」等问题。
- 基本用法：
  ```bash
  # Windows 验证 WSL2 后端
  wsl --status
  docker context ls                # Desktop on Windows 默认使用 desktop-linux context

  # Mac 切换虚拟化后端（Settings → Resources → Advanced）
  # 命令行查看当前架构
  docker info | grep -i "operating system\|architecture"
  ```
- 注意事项：WSL2 模式下镜像与卷实际存储在 `%LOCALAPPDATA%\Docker\wsl\` 的 ext4 虚拟磁盘里，`docker system prune` 不会回收已分配的 vhdx 空间，需用 `wsl --shutdown` + `diskpart compact` 压缩。

**镜像加速器（registry mirror）**
- 概念解释：在 `daemon.json` 中配置 `registry-mirrors`，让 dockerd 拉取镜像时优先走国内代理源，而不是直连 Docker Hub。
- 核心作用：解决国内访问 `registry-1.docker.io` 慢、超时、TLS 握手失败等问题。
- 基本用法：
  ```json
  // /etc/docker/daemon.json （Linux）
  // 或 Docker Desktop → Settings → Docker Engine （Mac/Windows）
  {
    "registry-mirrors": [
      "https://docker.1ms.run",
      "https://docker.xuanyuan.me"
    ]
  }
  ```
  ```bash
  sudo systemctl restart docker     # Linux 重启生效
  docker info | grep -A5 "Registry Mirrors"   # 验证
  ```
- 注意事项：镜像源频繁失效，2024-2025 年大量公共加速器关停；企业内应自建 Harbor 做代理缓存；mirror 只影响拉取，不影响 push（push 仍走原仓库地址）。

**第一个容器**
- 概念解释：`hello-world` 是官方最小镜像，仅打印一段说明后退出；`nginx` 是经典 Web 服务镜像，常用于验证端口映射与后台运行。
- 核心作用：用最小成本验证「安装是否成功、网络是否通、端口映射是否生效」。
- 基本用法：
  ```bash
  docker run hello-world                       # 验证安装
  docker run -d --name web -p 8080:80 nginx    # 后台跑 nginx 并映射端口
  curl http://localhost:8080                    # 看到 Welcome to nginx!
  docker logs web                               # 查看日志
  docker stop web && docker rm web              # 停止并删除
  ```
- 注意事项：`hello-world` 退出后容器状态为 `Exited`，需 `docker rm` 清理；本地无 nginx 镜像时会自动拉取，首次较慢；`-p 8080:80` 中宿主机端口在前、容器端口在后，易写反。

**命令结构总览**
- 概念解释：Docker CLI 采用 `docker <管理对象> <子命令> <参数>` 的三段式结构（即 Docker 1.13 后的统一格式），管理对象称为 management command。
- 核心作用：理解结构后可举一反三，新版本命令都能「猜」出来，不必死记。
- 基本用法：
  ```bash
  docker container ls                      # = docker ps
  docker image ls                          # = docker images
  docker volume create mydata
  docker network create mynet
  docker compose up -d                     # Compose v2 已作为 docker 子命令
  ```
- 注意事项：老式短命令（`docker ps`、`docker images`、`docker rm`）仍保留为别名，但脚本中推荐用新格式可读性更好；`docker compose`（v2，Go 实现）与 `docker-compose`（v1，Python）是两个不同二进制，新环境只用前者。

**环境验证三件套**
- 概念解释：`docker version` 展示 Client/Server 版本号；`docker info` 展示运行时全局状态；`docker context ls` 展示当前连接的 daemon。
- 核心作用：排障第一步永远是这三个命令，能快速判断「CLI 装了没、daemon 起没起、连的是哪个 daemon」。
- 基本用法：
  ```bash
  docker version          # 看 Client/Server 的 Version、API version、OS/Arch
  docker info             # 看 Containers、Images、Storage Driver、Registry Mirrors、Cgroup Version
  docker context ls       # Desktop 多端点切换关键
  ```
- 注意事项：`docker version` 同时有 Client 与 Server 两段，若只看到 Client 段说明 daemon 未启动；`docker info` 中 `Cgroup Version: 2` 是现代系统标配，cgroup v1 在新发行版已淘汰；`Server Version` 与 `API version` 不同，API 向下兼容，CLI 比 Server 新也能用。

**用户体验四件套（-it / -d / -p / -v）**
- 概念解释：`-i` 保持 stdin 打开、`-t` 分配伪终端（合用 `-it` 进交互）；`-d` 后台运行；`-p` 端口映射；`-v` 卷挂载（新写法 `--mount`）。
- 核心作用：覆盖 90% 日常容器启动需求，是「用得最多」的四个开关。
- 基本用法：
  ```bash
  docker run -it alpine sh                                   # 进容器交互
  docker run -d --name redis -p 6379:6379 redis:7            # 后台 + 端口
  docker run -d -p 8080:80 -v "$PWD/html":/usr/share/nginx/html nginx   # 挂载静态站点
  docker run --mount type=bind,source=/data,target=/data alpine ls /data # 推荐写法
  ```
- 注意事项：`-it` 与 `-d` 可同时用（后台跑但 stdin 备好），但单独 `-d` 后台时容器内进程若不是 TTY 可能立即退出；`-v` 用相对路径会创建匿名卷，务必用绝对路径或 `--mount`；Mac/Windows 挂载默认走 osxfs/9p/virtiofs，IO 性能远低于 Linux 原生 bind mount。

**卸载与清理**
- 概念解释：`docker system prune` 一次性清理停止的容器、悬空镜像、未使用网络、构建缓存；`docker system prune -a --volumes` 更激进，连非悬空镜像和卷一并清除。
- 核心作用：回收磁盘空间、卸载前清场、CI Runner 跑完归零。
- 基本用法：
  ```bash
  docker system df                       # 看磁盘占用
  docker system prune -f                 # 默认清理（不含卷、不含未使用镜像）
  docker system prune -a --volumes -f    # 全清，慎用！会删数据卷
  # 卸载 Engine（Ubuntu）
  sudo apt-get purge docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo rm -rf /var/lib/docker /var/lib/containerd
  ```
- 注意事项：`-a` 会删除所有当前未被任何容器使用的镜像（不只是悬空），下次启动容器要重新拉；`--volumes` 会删数据卷，数据库数据会丢；卸载前务必确认数据卷已备份。

---

### 章节题目（≥10道）

#### 【面试题】

**1. Docker Desktop 和 Docker Engine 有什么区别？生产环境该用哪个？**
- 答案：Desktop 是面向开发者的桌面一体化产品，内置 GUI、Kubernetes、文件共享、WSL2/Hypervisor 虚拟化层，运行在 Mac/Windows/Linux 桌面；Engine 是纯服务端组件（dockerd + containerd + runc），仅 Linux，无 GUI，资源占用低。生产环境必须用 Docker Engine，Desktop 的许可协议也禁止大型企业无订阅商用，且其虚拟化层引入额外开销与不可控因素，不适合服务器。
- 考点：产品定位、许可协议、虚拟化层差异、生产选型。

**2. 执行 `docker version` 只显示了 Client 段，没有 Server 段，是什么原因？如何排查？**
- 答案：说明 docker CLI 无法连接 dockerd。常见原因：1）daemon 未启动（Linux 上 `systemctl status docker` 应为 running）；2）当前用户不在 docker 组、且未用 sudo，导致无法访问 `/var/run/docker.sock`；3）Mac/Windows 上 Docker Desktop 未启动；4）`DOCKER_HOST` 环境变量指向了不可达的远程 daemon；5）`docker context` 切错了端点。排查顺序：`systemctl status docker` → `ls -l /var/run/docker.sock` → `docker context ls` → `echo $DOCKER_HOST`。
- 考点：CLI/Server 通信机制、unix socket 权限、context 概念。

**3. `docker system prune`、`docker system prune -a`、`docker system prune -a --volumes` 三者区别？**
- 答案：默认 prune 只删停止的容器、悬空镜像（`<none>` tag）、未使用网络、悬空构建缓存；加 `-a` 会删除所有未被任何容器引用的镜像（含具名镜像）；再加 `--volumes` 会删除未被任何容器使用的命名卷，相当于清空数据。生产慎用后两者，数据库卷被删不可恢复。
- 考点：清理范围、`-a` 与 `--volumes` 语义、数据安全。

#### 【论坛题】

**4.（来源：v2ex /r/docker）国内拉取 docker hub 镜像一直 timeout，配置了 `daemon.json` 的 registry-mirrors 仍报错，怎么办？**
- 答案：1）确认 `daemon.json` JSON 格式正确，重启 dockerd 后 `docker info` 能看到 Registry Mirrors 段；2）2024 年起多数公共加速器（如阿里云、网易、中科大）已关停或限速，建议改用仍在维护的源如 `https://docker.1ms.run`、`https://docker.xuanyuan.me`，或企业自建 Harbor 做 proxy cache；3）配置 HTTPS_PROXY 走代理也是常见方案；4）永久方案是改用国内镜像仓库（如阿里云 ACR、腾讯 TCR）托管自有镜像。
- 考点：mirror 配置验证、加速器现状、替代方案。

**5.（来源：StackOverflow）`docker run -d nginx` 后容器立即 Exited (0)，但 `docker run -d -it nginx` 能常驻，为什么？**
- 答案：nginx 官方镜像的 ENTRYPOINT 是 `/docker-entrypoint.sh`，CMD 是 `nginx -g 'daemon off;'`，本身应能常驻。若 Exited (0)，常见原因是镜像被覆盖了 CMD（如指定了 `bash` 而非 `-it`，bash 读不到 stdin 立即退出），或容器内进程不是 PID 1 且后台化后被 dockerd 认为容器结束。加 `-it` 让 stdin 保持打开 + 分配 TTY，前台进程得以挂住。正确做法是不要随意覆盖 CMD，或用 `docker run -d nginx` 不附加命令。
- 考点：容器生命周期、PID 1、`-it` 与 `-d` 配合、ENTRYPOINT/CMD。

**6.（来源：GitHub docker/for-win Issues）WSL2 模式下 `docker system prune` 后 vhdx 文件并没变小，怎么回收？**
- 答案：prune 只删除容器内对象，vhdx 是稀疏虚拟磁盘，删除后空间标记为可用但不会自动归还给 Windows。需手动压缩：1）`wsl --shutdown`；2）`diskpart` 中 `select vdisk file="...\docker-desktop.vhdx"` → `attach vdisk readonly` → `compact vdisk` → `detach vdisk`；或用 `Optimize-VHD` PowerShell cmdlet（需 Hyper-V 模块）。预防：定期 prune + 限制 `--storage-opt` 配额。
- 考点：WSL2 存储模型、稀疏磁盘、空间回收。

#### 【期末题/认证题】

**7.（DCA 认证风格）下列命令中，哪条能正确将容器 80 端口映射到宿主机 8080，并以守护态运行 nginx？**
- A. `docker run -p 80:8080 -d nginx`
- B. `docker run -p 8080:80 -d nginx`
- C. `docker run -d -p 80 nginx`
- D. `docker run -d -P 8080:80 nginx`
- 答案：B。`-p` 格式为 `宿主机端口:容器端口`，A 写反；C 不指定宿主机端口会随机分配；D `-P`（大写）是 Publish All，无需指定映射，写法错误。
- 考点：`-p` 端口顺序、`-p` 与 `-P` 区别。

**8.（高校期末）Docker CLI 的命令结构是 `docker <对象> <动作> <参数>`。请写出与下列旧命令等价的新格式命令：`docker ps`、`docker images`、`docker rm`、`docker rmi`。**
- 答案：
  - `docker ps` → `docker container ls`
  - `docker images` → `docker image ls`
  - `docker rm` → `docker container rm`
  - `docker rmi` → `docker image rm`
- 考点：管理对象分组、新旧命令等价关系。

**9.（DCA 认证风格）在 Linux 服务器上安装 Docker Engine 后，普通用户执行 `docker ps` 报 `permission denied while trying to connect to the Docker daemon socket`，最安全的解决方式？**
- 答案：将用户加入 docker 组：`sudo usermod -aG docker $USER`，然后重新登录（或 `newgrp docker`）生效。原理：`/var/run/docker.sock` 由 docker 组拥有。注意：加入 docker 组等价于赋予 root 权限（可挂载任意路径），多租户环境应改用 rootless mode 或限制 socket 权限。
- 考点：socket 权限模型、安全风险、rootless 替代方案。

#### 【官网题】

**10.（来源：官方安装文档 https://docs.docker.com/engine/install/ubuntu/）Ubuntu 上用 apt 仓库安装 Docker Engine 的正确步骤顺序是？**
- 答案：1）卸载旧版本 `for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do sudo apt-get remove $pkg; done`；2）设置 apt 仓库：`sudo apt-get update`、安装 ca-certificates/curl、添加 Docker 官方 GPG key 到 `/etc/apt/keyrings/docker.asc`、写入 `/etc/apt/sources.list.d/docker.list` 仓库源（含 `[signed-by=/etc/apt/keyrings/docker.asc]`）；3）`sudo apt-get update`；4）`sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin`。注意新版已废弃 `apt-key`，统一用 keyring 文件。
- 考点：apt 仓库配置、GPG key 新规范、必装组件清单。

**11.（来源：https://docs.docker.com/engine/reference/commandline/cli/）`docker context` 的作用是什么？如何切换到远程 daemon？**
- 答案：context 是 docker CLI 的「连接配置」集合，保存 name、description、docker endpoint（unix socket 或 tcp）、kubernetes endpoint 等。切换到远程 daemon 步骤：`docker context create remote --docker "host=ssh://user@1.2.3.4"` → `docker context use remote` → `docker context ls` 验证。常用场景：Mac Desktop 连服务器上的 Engine、CI 中多 daemon 切换、k8s 上下文与 docker 上下文联动。
- 考点：context 概念、远程 daemon 连接、多端点管理。

#### 【实战题】

**12.（项目场景）团队新成员入职，Mac M2 电脑，需配置一套能跑 Spring Boot + MySQL + Redis 的本地开发环境。请给出完整步骤。**
- 答案：
  1. 安装 Docker Desktop for Mac（Apple Silicon 版），启用 Use Virtualization framework + Rosetta for x86/amd64 emulation；
  2. Settings → Resources：CPU 8、Memory 8G、Swap 2G、Disk 64G；
  3. Settings → Docker Engine：配置 `registry-mirrors: ["https://docker.1ms.run"]`，`features.buildkit: true`；
  4. 项目根目录写 `docker-compose.yml`，定义 mysql:8.4（platform linux/amd64 或 arm64 镜像）、redis:7-alpine、应用服务用 `build: .` 走本地 Dockerfile；
  5. `docker compose up -d` 启动，`docker compose logs -f app` 看日志；
  6. 数据卷挂到 `./data/mysql` 与 `./data/redis`，便于热重载与备份；
  7. 提示：M2 跑 amd64 mysql 有性能损耗，优先选 arm64 原生镜像（mysql 官方已提供）。
- 考点：M 系列芯片适配、Desktop 资源调优、Compose 编排、数据持久化。

**13.（项目场景）CI Runner（Ubuntu 22.04）每次构建后磁盘很快被占满，请设计清理策略。**
- 答案：1）每次 job 末尾执行 `docker system prune -a -f --filter "until=6h"`，只删 6 小时前的对象，避免影响并发 job；2）构建缓存单独管理：`docker builder prune --filter "until=24h" -f`；3）定期（cron 每日凌晨）跑 `docker system prune -a --volumes -f` 全清；4）启用 BuildKit 的 `--no-cache-filter` 避免无效缓存堆积；5）监控：`docker system df -v` 输出接 Prometheus node-exporter textfile；6）配置 `/etc/docker/daemon.json` 的 `log-opts.max-size` 与 `max-file` 限制日志增长；7）极端方案：给 `/var/lib/docker` 单独挂盘，定期 `dd` 备份后重建。
- 考点：CI 磁盘治理、prune filter、构建缓存、日志限制。

---

### 项目常用场景

**场景1：国内开发环境配置（Mac/Windows）**
- 背景：新员工入职或新机器初始化，拉镜像超时、构建慢，影响开发体验。
- 解决方案：
  ```bash
  # 1. Docker Desktop → Settings → Docker Engine，写入：
  cat <<'EOF' > ~/Library/Group\ Containers/group.com.docker/settings-store.json
  （通过 GUI 修改更安全，下面是 daemon.json 内容）
  EOF
  # daemon.json 实际内容：
  {
    "registry-mirrors": ["https://docker.1ms.run", "https://docker.xuanyuan.me"],
    "features": { "buildkit": true },
    "builder": { "gc": { "defaultKeepStorage": "20GB" } }
  }
  # 2. 重启 Docker Desktop
  # 3. 验证
  docker info | grep -A5 "Registry Mirrors"
  docker pull alpine:3.20   # 应秒级完成
  ```
- 最佳实践：企业内统一通过自建 Harbor 的「代理仓库」做 cache，mirror URL 指向 Harbor，可缓存所有上游镜像；开发文档中固化配置，新机初始化脚本一键写入。

**场景2：CI 环境（GitHub Actions / GitLab Runner）安装 Docker**
- 背景：CI Runner 通常是临时 VM，每次都要从零装 Docker 并跑构建。
- 解决方案（GitHub Actions 示例）：
  ```yaml
  jobs:
    build:
      runs-on: ubuntu-22.04
      steps:
        - uses: docker/setup-buildx-action@v3      # 自动装 buildx
        - uses: docker/login-action@v3
          with:
            registry: ghcr.io
            username: ${{ github.actor }}
            password: ${{ secrets.GITHUB_TOKEN }}
        - uses: docker/build-push-action@v5
          with:
            context: .
            push: true
            tags: ghcr.io/org/app:${{ github.sha }}
            cache-from: type=gha
            cache-to: type=gha,mode=max
  ```
  自托管 Runner 装机脚本：
  ```bash
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker gitlab-runner
  sudo systemctl enable --now docker
  echo '{"log-opts":{"max-size":"10m","max-file":"3"}}' | sudo tee /etc/docker/daemon.json
  sudo systemctl restart docker
  ```
- 最佳实践：用官方 action 而非手写脚本；构建缓存用 `cache-from/cache-to` 持久化到 GHA cache 或 registry；日志大小必须限制，否则跑几千次后磁盘爆满。

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|---------|---------|
| Docker Desktop | Docker Engine | Desktop 含 GUI + VM + K8s + 文件共享，Mac/Windows/Linux 桌面用；Engine 纯 dockerd，仅 Linux | 开发本地用 Desktop，生产服务器用 Engine |
| `-it`（交互） | `-d`（后台） | `-it` 前台占终端、stdin 打开；`-d` 释放终端、后台运行 | 调试用 `-it`，长跑服务用 `-d`，可叠加 `-dit` |
| `-p 8080:80` | `-P`（大写） | `-p` 指定宿主:容器端口映射；`-P` 自动把 Dockerfile 里所有 EXPOSE 端口映射到宿主机 49000-49900 随机端口 | 明确端口用 `-p`，临时调试用 `-P` |
| `docker system prune` | `docker rm`/`docker rmi` | prune 批量清理未被引用的对象；rm/rmi 精确删单个对象 | 日常空间回收用 prune，定向清理用 rm/rmi |
| `docker compose`（v2） | `docker-compose`（v1） | v2 是 docker CLI 的 Go 插件，随 Desktop/Engine 一起分发；v1 是独立 Python 二进制，已停止维护 | 新环境一律用 `docker compose`（空格） |
| `-v /host:/container` | `--mount type=bind,...` | `-v` 老语法，相对路径会变匿名卷；`--mount` 显式声明类型，参数顺序清晰 | 脚本与文档推荐 `--mount`，快速命令用 `-v` |

---

### 常见陷阱与坑点

**陷阱1：WSL2 未启用导致 Docker Desktop 启动失败**
- 现象：Windows 上 Docker Desktop 启动报 `WSL 2 installation is incomplete`，或一直卡在 "Docker Desktop starting..."。
- 原因：WSL2 组件未启用、内核未更新，或 BIOS 未开虚拟化（VT-x/AMD-V）。
- 解决方案：
  ```powershell
  # 管理员 PowerShell
  dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
  dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
  wsl --set-default-version 2
  wsl --update                  # 更新 WSL 内核
  # 重启后 BIOS 确认虚拟化开启
  ```
- 预防措施：装机文档前置 WSL2 检查；IT 镜像预装 WSL2 + 最新内核；用 `wsl --status` 做健康检查脚本。

**陷阱2：docker.sock 权限问题**
- 现象：普通用户 `docker ps` 报 `permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock`。
- 原因：`/var/run/docker.sock` 由 root:docker 拥有，权限 660，当前用户不在 docker 组。
- 解决方案：`sudo usermod -aG docker $USER` 然后 `newgrp docker` 或重新登录；临时方案 `sudo docker ps`。
- 预防措施：装机脚本自动加用户到 docker 组；提醒「docker 组 = root 权限」，敏感环境改用 rootless mode（`dockerd-rootless.sh`）或 Podman。

**陷阱3：磁盘占用过大（Mac/Windows vhdx 不回收）**
- 现象：Docker Desktop 用了几个月，`Docker.raw` 或 `docker-desktop.vhdx` 涨到 60G+，但容器实际只占 10G，`prune` 后文件不缩小。
- 原因：Desktop 在 Mac 用 sparsebundle、Windows 用 vhdx，文件系统删除只标记空闲，不归还给宿主 FS。
- 解决方案：
  - Mac：Settings → Resources → Disk image size 调小后重启；或 `docker system prune -a --volumes -f` 后用 `hdiutil compact` 压缩 sparsebundle。
  - Windows：`wsl --shutdown` → `diskpart` `compact vdisk` 压缩 vhdx。
  - 终极方案：删除 DockerDesktop.vhdx 重建（先备份卷数据！）。
- 预防措施：定期 `docker system prune -a -f`；限制 Desktop 磁盘配额；CI Runner 每次构建后归零；敏感数据用命名卷而非容器内临时文件。

**陷阱4：`-v` 相对路径悄悄变成命名卷**
- 现象：`docker run -v data:/data alpine` 与 `docker run -v ./data:/data alpine` 行为完全不同，前者创建名为 data 的命名卷，后者才是 bind mount；写成 `docker run -v data:/data` 时如果当前目录恰好有 `data` 子目录，仍按命名卷处理。
- 原因：`-v` 第一段若以 `/` 开头视为绝对路径 bind mount，否则视为卷名；`--mount` 则用 `type=` 显式区分。
- 解决方案：统一用 `--mount type=bind,source="$(pwd)/data",target=/data`，避免歧义。
- 预防措施：CI 脚本与 compose 文件强制用 `--mount`；代码审查关注卷挂载写法。

---

### 实践信号

#### 官方进阶文档
- **Docker Engine 安装（Ubuntu）**：https://docs.docker.com/engine/install/ubuntu/ - 学习重点：apt 仓库标准配置、GPG keyring 新规范、卸载步骤、从旧版本迁移。
- **Docker Desktop for Mac**：https://docs.docker.com/desktop/mac/ - 学习重点：虚拟化后端选择（Apple Virtualization vs QEMU）、资源配额、文件共享性能、Rosetta 模拟。
- **docker context 命令参考**：https://docs.docker.com/engine/reference/commandline/context/ - 学习重点：多 daemon 切换、远程端点配置、与 k8s context 关系。
- **daemon.json 配置参考**：https://docs.docker.com/engine/reference/commandline/dockerd/#daemon-configuration-file - 学习重点：registry-mirrors、log-opts、storage-driver、builder GC 等关键项。

#### 社区热议话题
- **话题：国内 Docker Hub 镜像加速器大面积失效后的替代方案**
  - 来源：v2ex、掘金、知乎「docker 镜像加速」相关讨论
  - 讨论要点：2024 年 6 月起阿里云、网易、中科大等公共加速器陆续关停或限速，社区转向 `1ms.run`、`xuanyuan.me` 等小站镜像；长期方案是自建 Harbor proxy cache 或迁到国内镜像仓库（ACR/TCR）。
  - 高赞答案摘要：企业自建 Harbor 配 proxy cache 指向 docker.io，再让 daemon.json mirror 指向 Harbor，既稳定又能缓存所有上游。
- **话题：Docker Desktop 商业许可调整后的开源替代**
  - 来源：Hacker News、Reddit r/docker 关于 Docker Subscription 的讨论
  - 讨论要点：≥250 员工企业需付费，社区讨论 Podman、Rancher Desktop、OrbStack、colima 等替代方案。
  - 高赞答案摘要：Mac 个人开发推荐 OrbStack（轻量、快、兼容 docker CLI）；企业 CI 推荐 Podman（无 daemon、rootless）；需要完整兼容则 Rancher Desktop（基于 k3s + moby）。

#### 动手验证
请完成以下实践任务：

1. **安装验证与第一条容器**
   - 要求：在你的机器上完成 Docker 安装，执行 `docker run hello-world` 成功输出，并执行 `docker run -d -p 8080:80 --name web nginx` 后用 `curl http://localhost:8080` 拿到 nginx 默认页。
   - 预期输出：`hello-world` 打印 "Hello from Docker!"；`curl` 返回包含 "Welcome to nginx!" 的 HTML；`docker ps` 看到 web 容器 STATUS 为 Up。
   - 提示：若拉取超时，先配置 registry-mirrors；Mac M 系列无需手动指定 platform，nginx 有 arm64 镜像。

2. **镜像加速器配置与验证**
   - 要求：修改 `daemon.json`（Linux 路径 `/etc/docker/daemon.json`，Mac/Windows 在 Docker Desktop → Settings → Docker Engine），加入至少一个 mirror，重启 daemon 后用 `docker info` 验证。
   - 预期输出：`docker info` 输出包含 `Registry Mirrors:` 段且列出你配置的 URL；`time docker pull alpine:3.20` 在 5 秒内完成。
   - 提示：JSON 格式错误会导致 dockerd 启动失败，可用 `jq . /etc/docker/daemon.json` 先校验。

3. **磁盘占用分析与清理**
   - 要求：执行 `docker system df -v` 记录当前占用；然后 `docker pull` 3 个不同镜像（如 alpine、redis、postgres）；再执行 `docker system prune -a -f`；对比 prune 前后的 `docker system df` 输出。
   - 预期输出：prune 前显示多个镜像占用，prune 后 RECLAIMABLE 列大幅下降；理解 `-a` 会删所有未被容器引用的镜像。
   - 提示：生产环境禁止加 `--volumes`，会删数据卷。

4. **多 context 切换远程 daemon**（进阶）
   - 要求：在一台 Linux 服务器上开启 dockerd TCP 监听（`-H tcp://0.0.0.0:2375`，仅实验环境，生产必须 TLS）；在本地用 `docker context create` 创建指向该服务器的 context 并切换；`docker info` 验证 Server 段变为远程服务器信息。
   - 预期输出：`docker context ls` 显示新 context；切换后 `docker info` 的 `Name:` 与 `Operating System:` 反映远程服务器。
   - 提示：2375 无加密无认证，仅在隔离实验网使用；生产必须用 2376 + TLS 证书，或用 `ssh://` 通道（`docker context create --docker host=ssh://user@host`）。

---

## 章节小结
本章把 Docker 跑起来：区分 Desktop 与 Engine 两种安装形态，掌握各平台差异与国内镜像加速配置，用 `docker run` 完成第一条容器验证，理解命令结构与 `-it/-d/-p/-v` 四件套，最后学会用 `docker system prune` 治理磁盘——这些是后续镜像构建、容器编排、生产部署的所有实践的地基。
