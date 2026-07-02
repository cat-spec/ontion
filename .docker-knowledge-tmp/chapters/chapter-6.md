## 第6章 数据持久化与存储

### 核心知识点

> 容器的设计哲学是"无状态、即用即弃"，但现实业务几乎都需要持久化数据。Docker 提供三种存储机制（volume / bind mount / tmpfs）来打破容器可写层与容器同生命周期的限制。理解三者的差异、卷的存储位置与驱动模型、以及容器内 UID/GID 与主机用户的映射关系，是避免生产数据丢失与权限事故的关键。

**1. 为什么容器数据会丢：可写层与写时复制（CoW）**
- 概念解释：镜像由一组只读层（layer）叠加而成，容器启动时 Docker 在最顶层加一个**可写层（writable layer）**，所有对文件系统的修改都写入这一层。这一层与容器同生命周期，容器一删，数据即失。
- 核心作用：理解可写层的存在与局限，才能知道何时必须引入 volume。
- 行为细节：
  - **写时复制（Copy-on-Write, CoW）**：容器内修改镜像中已存在的文件时，Docker 先把该文件从只读层复制到可写层，再写入。读未修改的文件仍走只读层。
  - **性能损耗**：CoW 复制开销 + overlay2/aufs 的元数据查找开销，使可写层写入性能低于直接写主机文件系统；大量小文件写入时尤其明显。
  - **存储位置**：可写层位于 `/var/lib/docker/overlay2/<container-id>/diff`，由 storage driver 管理。
- 验证命令：
  ```bash
  docker run -d --name box alpine sh -c 'echo hi > /tmp/x; sleep 600'
  docker inspect -f '{{.GraphDriver.Data.UpperDir}}' box   # 可写层路径
  sudo ls "$(docker inspect -f '{{.GraphDriver.Data.UpperDir}}' box)"   # 看到 tmp/x
  docker rm -f box    # 可写层随之销毁，数据丢失
  ```
- 注意事项：
  - 数据库、消息队列、用户上传文件等有状态数据**严禁**写在可写层。
  - 可写层与镜像共享只读层，多个容器对同一文件的修改互不影响（各自 CoW）。
  - 容器 commit 会把可写层变成新镜像的只读层，但不应作为持久化方案。

**2. 三种存储类型对比：volume / bind mount / tmpfs**
- 概念解释：Docker 提供三种让数据脱离容器可写层的机制：
  | 类型 | 存储位置 | 由谁管理 | 跨平台 | 典型场景 |
  |------|---------|---------|--------|---------|
  | **volume（命名卷/匿名卷）** | `/var/lib/docker/volumes/` 下由 Docker 管理 | Docker | 是 | 数据库数据、应用状态、跨主机共享 |
  | **bind mount** | 主机任意绝对路径 | 用户（自己负责路径与权限） | 部分（Windows 路径行为不同） | 本地开发源码挂载、配置文件注入 |
  | **tmpfs** | 主机内存（RAM） | Docker | 是 | 敏感临时数据、高频读写缓存 |
- 核心作用：volume 是 Docker 官方推荐的首选；bind mount 适合开发态把主机目录映射进容器；tmpfs 适合不想落盘的临时数据。
- 选用决策树：
  - 需要跨主机迁移 / 不关心主机路径 → **volume**
  - 需要在主机直接编辑源码 / 配置 → **bind mount**
  - 数据敏感且不需要持久化 / 追求内存级 IO → **tmpfs**
- 注意事项：
  - bind mount 在 macOS/Windows 上通过虚拟机转发，性能与 Linux 原生不同（macOS 25.x 用 VirtioFS 改善但仍弱于 Linux 原生）。
  - tmpfs 大小受 `--tmpfs` 或 `--mount type=tmpfs,tmpfs-size` 限制，默认占用主机一半内存。
  - volume 在容器删除后仍存在，需要显式 `docker volume rm` 或 `docker volume prune` 清理。

**3. Volume（命名卷）：Docker 管理的持久化卷**
- 概念解释：命名卷由 Docker 创建并管理，存放在 `/var/lib/docker/volumes/<name>/_data`，独立于任何容器生命周期。卷可被多个容器同时挂载，可指定 volume driver 接入 NFS、云盘、分布式存储。
- 核心作用：在多主机、多平台环境中提供一致、可迁移、可共享的持久化存储。
- 基本用法：
  ```bash
  docker volume create pg_data              # 创建命名卷
  docker volume ls                          # 列出所有卷
  docker volume inspect pg_data             # 查看挂载点与 driver
  docker volume rm pg_data                  # 删除卷（无容器引用时）
  docker volume prune                       # 清理 dangling 卷（未被任何容器引用）
  docker volume prune -f --filter "until=24h"   # 清理 24h 前的 dangling 卷

  # 挂载到容器（推荐 --mount 语法）
  docker run -d --name pg \
    --mount type=volume,src=pg_data,dst=/var/lib/postgresql/data \
    -e POSTGRES_PASSWORD=secret postgres:16

  # 等价 -v 写法
  docker run -d --name pg -v pg_data:/var/lib/postgresql/data -e POSTGRES_PASSWORD=secret postgres:16
  ```
- 卷的存储位置：默认 `/var/lib/docker/volumes/<volume-name>/_data`，元数据放在同目录 `_data` 同级的目录中。可通过 `docker volume inspect -f '{{.Mountpoint}}' pg_data` 查询。
- 卷驱动（volume plugin）：
  - `local`（默认）：本机磁盘，可选 NFS/CIFS/sshfs 等子选项。
  - `local` + NFS：
    ```bash
    docker volume create --driver local \
      --opt type=nfs \
      --opt o=addr=10.0.0.5,rw \
      --opt device=:/export/pg \
      nfs_pg
    ```
  - 第三方驱动：RexRay、Portworx、GlusterFS、Ceph RBD、云厂商 AWS EBS / Azure Disk / GCE PD 等，用于跨主机持久化。
- 注意事项：
  - 命名卷在**首次被容器挂载**时，Docker 会把镜像中目标目录已存在的文件**复制到卷中**（初始化），这是与 bind mount 最大的语义差异之一。
  - 卷的命名卷与匿名卷区别：匿名卷（`-v /var/lib/pg` 不带名称）会生成一长串哈希名，容器删除后易成 dangling。
  - 跨主机共享需借助 NFS/分布式 driver，单机命名卷不能直接被另一台机器读取。

**4. Bind Mount：挂载主机路径**
- 概念解释：bind mount 把主机上一个**绝对路径**直接映射到容器内某路径，绕过 Docker 的卷管理层。容器内对挂载点的读写等于对主机目录的读写。
- 核心作用：开发态源码热重载、向容器注入配置文件、让容器产物直接落盘到主机。
- 基本用法：
  ```bash
  # 推荐写法
  docker run -d --name web \
    --mount type=bind,src=/Users/work1/Documents/ontion/webapp,dst=/app \
    node:20-alpine

  # 等价 -v 写法（必须绝对路径）
  docker run -d --name web -v /Users/work1/Documents/ontion/webapp:/app node:20-alpine

  # 只读挂载（配置注入场景）
  docker run -d --name web \
    --mount type=bind,src=/etc/nginx/conf.d,dst=/etc/nginx/conf.d,readonly \
    nginx:1.25
  ```
- 注意事项：
  - **必须用绝对路径**；`-v ./app:/app` 这种相对路径在 `-v` 中会被当作命名卷（见陷阱章节）。
  - **不会初始化**：bind mount 目标目录若主机路径不存在，Docker 会自动创建（属主 root）；容器内挂载点的原内容会被主机目录"遮蔽"（masked），卸载后才恢复可见。
  - **权限问题高发**：容器内进程 UID 与主机 UID 是同一套数字身份，主机目录的属主/权限直接决定容器能否读写（详见知识点 8）。
  - macOS/Windows 上 bind mount 性能弱于 Linux 原生，开发大项目时建议用命名卷或开启 VirtioFS / gRPC FUSE 缓存。

**5. tmpfs：内存挂载**
- 概念解释：tmpfs mount 把一段主机内存挂载到容器内，不落盘。容器停止即销毁，无法在容器间共享（仅限单容器）。
- 核心作用：存放敏感临时数据（如 token、session）或追求内存级 IO 的临时缓存，避免敏感数据写盘。
- 基本用法：
  ```bash
  # --mount 写法
  docker run -d --name cache \
    --mount type=tmpfs,dst=/cache,tmpfs-size=64m,tmpfs-mode=1777 \
    redis:7-alpine

  # --tmpfs 简写（不支持细粒度选项）
  docker run -d --name cache --tmpfs /cache:64m,mode=1777 redis:7-alpine
  ```
- 注意事项：
  - tmpfs 仅 Linux 支持，Windows 容器不支持。
  - 默认大小为主机内存的 50%，超出会触发 ENOSPC 报错。
  - tmpfs 无法在多个容器间共享；如需共享内存数据，需用 `--ipc` 共享 IPC 命名空间或外置 Redis。

**6. -v 与 --mount 两种语法：区别与推荐**
- 概念解释：Docker 历史上先后出现两套挂载语法：
  - `-v` / `--volume`：旧语法，三段式 `src:dst[:mode]`，通过字段顺序与是否以 `/` 开头来**隐式推断**类型（绝对路径→bind，名称→volume，省略 src→匿名卷）。
  - `--mount`：新语法（17.06+ 推荐），键值对 `type=...,src=...,dst=...,readonly=...`，**显式声明**类型与每个字段。
- 语法对比：
  | 维度 | `-v` / `--volume` | `--mount` |
  |------|------------------|-----------|
  | 字段顺序 | 必须按 `src:dst:opts` 顺序 | 键值对，顺序无关 |
  | 类型推断 | 隐式（看是否 `/` 开头） | 显式 `type=bind/volume/tmpfs` |
  | 错误提示 | 易被静默当作命名卷 | 路径不存在/类型错误会明确报错 |
  | 可读性 | 简短但易错 | 略长但语义清晰 |
  | 推荐度 | 历史兼容、Compose 仍大量使用 | **官方推荐**，生产与脚本首选 |
- 示例对照：
  ```bash
  # bind mount
  -v /host/app:/app:ro
  --mount type=bind,src=/host/app,dst=/app,readonly

  # named volume
  -v pg_data:/var/lib/postgresql/data
  --mount type=volume,src=pg_data,dst=/var/lib/postgresql/data

  # anonymous volume
  -v /var/lib/postgresql/data
  --mount type=volume,dst=/var/lib/postgresql/data

  # tmpfs
  --tmpfs /cache:64m
  --mount type=tmpfs,dst=/cache,tmpfs-size=64m
  ```
- 注意事项：
  - `--mount` 的只读用 `readonly` 或 `readonly=true`，不能写 `ro`（`ro` 是 `-v` 的语法）。
  - Docker Compose 仍主要用 `-v` 短语法，但 v3.x 也支持 `--mount` 风格的 long syntax。
  - 生产脚本、CI/CD 强烈建议统一用 `--mount`，避免"相对路径被当命名卷"类陷阱。

**7. 容器间共享数据：命名卷共享、volumes_from（已弃用）、只读挂载**
- 概念解释：多个容器共享同一份数据，三种典型做法：命名卷共享、`--volumes-from`（已弃用）、只读挂载 `:ro`。
- 命名卷共享（推荐）：
  ```bash
  docker volume create shared
  docker run -d --name app1 --mount type=volume,src=shared,dst=/data web:1.0
  docker run -d --name app2 --mount type=volume,src=shared,dst=/data web:1.0
  # 两个容器同时读写 /data，底层是同一卷
  ```
- `--volumes-from`（已弃用但仍可用）：
  ```bash
  docker run -d --name app1 -v shared:/data web:1.0
  docker run -d --name app2 --volumes-from app1 web:1.0
  # app2 继承 app1 的所有挂载（含 bind mount）
  ```
  - 弃用原因：隐式耦合（app2 依赖 app1 的挂载声明）、不利于编排系统理解。生产应改用命名卷显式共享。
- 只读挂载 `:ro` / `readonly`：
  ```bash
  docker run -d --name web \
    --mount type=bind,src=/etc/nginx/conf.d,dst=/etc/nginx/conf.d,readonly \
    nginx:1.25
  ```
  - 用途：把配置/静态资源以只读方式注入容器，防止容器内进程误改主机文件，是安全最佳实践。
  - 注意：只读是对挂载点的限制；容器内若再写子路径会报 read-only file system。
- 注意事项：
  - 多容器并发写同一卷需应用层加锁，Docker 不提供并发控制。
  - `--volumes-from` 在 Docker 25.x 仍工作但官方文档建议迁移到命名卷。

**8. 权限与 UID/GID 一致性问题（生产高频问题）**
- 概念解释：Linux 的文件权限基于数字 UID/GID，**容器内的 UID 与主机 UID 是同一套数字空间**。容器进程以哪个 UID 运行，在主机看来就是哪个 UID 在读写挂载目录。
- 典型冲突场景：
  - 容器内进程以 root（UID 0）运行，bind mount 主机目录后写入的文件属主变成 root，主机普通用户无法读取/删除。
  - 主机目录属主是 `1000:1000`，容器内进程默认 root，写入报 `Permission denied`（若主机开了 SELinux/AppArmor）或写入后属主错乱。
  - 镜像内置用户（如 postgres UID 999、mysql UID 999、nginx UID 101）与主机目录属主不一致，启动时报权限错误。
- 解决方案：
  1. **统一 UID/GID**：构建镜像时创建与主机用户相同 UID 的用户，或运行时用 `-u 1000:1000` 指定：
     ```bash
     docker run -d --name web -u $(id -u):$(id -g) \
       -v /home/me/app:/app node:20
     ```
  2. **chown 主机目录**：把主机目录属主改成容器内用户的 UID（如 `chown -R 999:999 /var/lib/pg`）。
  3. **使用命名卷规避**：命名卷由 Docker 管理，初始权限由 Docker 设置，多数情况能避免属主错乱；但跨用户访问仍需注意。
  4. **BuildKit 的 `--user` + `useradd -u`**：构建期动态创建用户。
  5. **rootless Docker**：以非 root 身份运行整个 Docker daemon，UID 通过 subuid/subuid 映射隔离，从根本上解决权限污染。
- 注意事项：
  - `chown` 主机目录可能影响其他服务，需评估副作用。
  - SELinux（CentOS/RHEL）下需加 `:z`（共享）或 `:Z`（私有）标签：`-v /host/app:/app:z`，否则容器无法访问。
  - Kubernetes 中类似问题用 `securityContext.runAsUser` + `fsGroup` 解决。

---

### 章节题目

#### 【面试题】

**Q1：Docker 的三种存储类型 volume / bind mount / tmpfs 各自的存储位置、生命周期与适用场景是什么？生产数据库该选哪种？**
- 答案：
  | 类型 | 存储位置 | 生命周期 | 适用场景 |
  |------|---------|---------|---------|
  | volume | `/var/lib/docker/volumes/<name>/_data`（Docker 管理） | 独立于容器，需 `docker volume rm` 才删 | 数据库、应用状态、跨主机共享 |
  | bind mount | 主机任意绝对路径 | 取决于主机路径 | 开发热重载、配置注入 |
  | tmpfs | 主机内存 | 容器停止即销毁 | 敏感临时数据、内存级缓存 |
  - 生产数据库应选 **volume（命名卷）**：① 独立生命周期，容器重建不丢数据；② Docker 管理权限，避免 UID 错乱；③ 可换 driver 接 NFS/云盘做跨主机；④ 备份/迁移有成熟工具链。
- 考点：三种存储对比、生产选型。难度：★★★

**Q2：`docker run -v` 与 `--mount` 的核心区别是什么？为什么官方推荐 `--mount`？**
- 答案：
  - `-v` 用三段式 `src:dst:opts`，**通过字段顺序与是否以 `/` 开头隐式推断类型**（绝对路径→bind，名称→volume，省略 src→匿名卷）；`--mount` 用键值对 `type=...,src=...,dst=...` **显式声明类型**。
  - 推荐原因：
    1. **语义明确**：`type=bind` 一眼可辨，避免 `-v ./app:/app` 这种相对路径被静默当作命名卷。
    2. **错误更早暴露**：`--mount` 在 bind 主机路径不存在时报错；`-v` 会自动创建空目录，导致"挂上了但没数据"的诡异现象。
    3. **字段无歧义**：`readonly` vs `ro`、`tmpfs-size` vs 简写，`--mount` 的 long syntax 更清晰。
    4. 与 Compose long syntax 一致，便于迁移。
  - 兼容性：`-v` 仍广泛使用（尤其 Compose），Docker 25.x 不会废弃，但生产脚本推荐 `--mount`。
- 考点：语法差异、生产规范。难度：★★★

**Q3：bind mount 在 macOS 上的性能为什么比 Linux 差？有哪些缓解方案？**
- 答案：
  - 根因：macOS 上 Docker 运行在 LinuxKit 虚拟机中，bind mount 需通过 gRPC-FUSE / VirtioFS 把 macOS 主机目录转发到 VM 内的容器，IO 路径多了一跳；文件系统事件（inotify）也要跨边界传递，热重载常失效。
  - 缓解方案：
    1. 升级到 Docker Desktop 4.6+ 启用 **VirtioFS**（性能显著优于旧的 osxfs/gRPC-FUSE）。
    2. 改用命名卷（数据存在 VM 内 ext4，无跨边界开销），需要同步源码时用 `docker cp` 或挂载点内 git clone。
    3. 大型前端项目用 **Mutagen / docker-sync** 双向同步，避免直接 bind mount。
    4. 关闭不需要文件系统事件的容器（如非热重载服务）改用命名卷。
    5. 必要时迁移开发环境到 Linux 主机或远程 DevContainer。
- 考点：跨平台存储行为、性能优化。难度：★★★★

#### 【论坛题】

**Q4：【来源：Stack Overflow 高赞】bind mount 后容器内写入文件，主机上看到属主是 root，导致主机用户无法读取/删除，怎么解决？**
- 答案：
  - 根因：容器内进程默认以 root（UID 0）运行，写入的文件属主自然是 root；容器与主机共享数字 UID 空间。
  - 解决方案（按优先级）：
    1. **运行时指定 UID**：`docker run -u $(id -u):$(id -g) -v $PWD/app:/app node:20`，写入文件属主与主机用户一致。
    2. **构建镜像时创建匹配用户**：`RUN useradd -u 1000 -m appuser && USER appuser`。
    3. **改用命名卷**：Docker 初始化卷时设置合理权限，避免属主污染；需在主机直接访问时用 `docker run --rm -v myvol:/data alpine ls -l /data` 中转。
    4. **事后修复**：`sudo chown -R $USER:$USER ./app` 改回属主，再下次用 `-u` 启动。
  - 预防：开发环境统一用 `-u $(id -u):$(id -g)`；生产用 rootless Docker 或非 root 镜像。
- 考点：UID/GID 映射、bind mount 权限。难度：★★★★

**Q5：【来源：Reddit r/docker】容器删除后数据没了，但明明用了 `-v`，怎么回事？**
- 答案：
  - 排查方向：
    1. **用的是匿名卷 + `--rm`**：`docker run --rm -v /var/lib/pg ...` 创建的是匿名卷，容器退出时 `--rm` 会一并删除匿名卷。
    2. **bind mount 的主机路径不对**：`-v ./data:/data` 在某些 shell 下 `./data` 解析成相对路径被当作命名卷 `data`，实际数据写在 `/var/lib/docker/volumes/data/_data` 而非 `./data`。
    3. **挂载目标路径写错**：容器内进程实际写到了非挂载路径（如 `/data` 挂载但应用写到 `/var/data`），数据进了可写层。
    4. **docker volume prune 误删**：dangling 的匿名卷会被 `docker volume prune` 清掉。
  - 验证：`docker inspect <c> -f '{{json .Mounts}}' | jq` 看实际挂载类型与路径。
  - 预防：① 用 `--mount` 显式声明 `type=volume,src=命名卷名,dst=...`；② 生产数据库用命名卷且不用 `--rm`；③ 关键数据卷加标签 `docker volume create --label app=pg` 便于审计。
- 考点：匿名卷 vs 命名卷、--rm 行为、路径解析。难度：★★★★

**Q6：【来源：Docker Forums】SELinux 系统上 bind mount 报 `Permission denied`，但权限看着没问题，为什么？**
- 答案：
  - 根因：SELinux 强制访问控制给每个文件/进程打标签（如 `system_u:object_r:container_file_t:s0`），主机目录默认标签不被容器进程允许访问。
  - 解决方案：
    1. `-v /host/app:/app:z` —— `:z` 让 Docker 自动给主机路径打"共享"标签 `container_file_t`，可被多个容器共享。
    2. `-v /host/app:/app:Z` —— `:Z` 打"私有"标签，仅当前容器可访问。
    3. 手动 `chcon -Rt container_file_t /host/app` 永久改标签。
    4. 临时关闭 SELinux（`setenforce 0`）—— **不推荐**，仅排查用。
  - 用 `--mount` 等价语法：`--mount type=bind,src=/host/app,dst=/app,bind-propagation=shared,z`（注意 `:z` 是 `-v` 的简写）。
  - 注意：`:z` / `:Z` 仅 SELinux 系统有意义，非 SELinux 系统会被忽略。
- 考点：SELinux 标签、bind mount 安全。难度：★★★★

#### 【期末题/认证题】

**Q7：【DCA 认证题】下列关于 Docker volume 的说法，哪些是正确的？**
A. 命名卷在容器删除后仍存在，需 `docker volume rm` 才能删除
B. 匿名卷在容器删除时一定会被删除
C. 命名卷首次挂载时，Docker 会把镜像中目标目录的文件复制到卷中
D. 卷只能存放在 `/var/lib/docker/volumes/` 下
E. 卷可指定 driver 接入 NFS 或云盘
- 答案：**A、C、E**
  - A 对：命名卷独立于容器生命周期。
  - B 错：匿名卷在容器删除时**默认保留**，仅在使用 `--rm` 启动时才会随容器删除。`docker volume prune` 才会清理 dangling 匿名卷。
  - C 对：这是 volume 与 bind mount 的关键差异，称为"初始化"。
  - D 错：通过 volume driver 可挂载 NFS/云盘/分布式存储，数据不在本地。
  - E 对：volume driver 机制支持多种后端。
- 考点：volume 生命周期、初始化、driver。难度：★★★

**Q8：【大学期末】简述容器可写层（writable layer）的写时复制（CoW）机制，并说明其对性能的影响。**
- 答案：
  - 机制：镜像由多个只读层叠加，容器启动时在最顶层加一个可写层。容器内**修改**镜像中已存在的文件时，Docker 先把该文件从只读层**复制**到可写层，再进行修改；后续读该文件走可写层，读其他未修改文件仍走只读层。这个"用时才复制"的特性即写时复制（Copy-on-Write）。
  - 性能影响：
    1. **首次写有复制开销**：大文件首次修改需整文件复制，IO 与延迟放大。
    2. **元数据查找开销**：overlay2 需层层查找文件所在层，深镜像下查找成本上升。
    3. **大量小文件写入**：可写层管理分散的小文件性能弱于直接写主机文件系统。
    4. **不适合有状态数据**：数据库、日志等高频写入场景应使用 volume/bind mount，避免可写层成为瓶颈。
  - 缓解：使用 overlay2（最现代的 storage driver）、将高频写入路径挂载到 volume。
- 考点：CoW 原理、性能影响。难度：★★★

#### 【官网题】

**Q9：【来源 docs.docker.com/storage/volumes/】命名卷首次挂载到容器时，Docker 如何处理镜像中目标目录已存在的文件？**
- 答案（依据 https://docs.docker.com/storage/volumes/#populate-a-volume-using-a-container）：
  - 当一个**空的命名卷**首次被容器挂载到某路径时，Docker 会把镜像中该路径下的文件**复制到卷中**（populate），再挂载。这保证了镜像自带的初始数据（如默认配置、初始化脚本）能被容器访问。
  - 若卷**非空**，则直接挂载，镜像中目标路径的内容被遮蔽（masked）。
  - bind mount **不执行**此初始化：主机目录会直接覆盖容器内挂载点，原镜像内容不可见。
  - 示例：
    ```bash
    docker volume create nginx_conf
    docker run --rm -v nginx_conf:/etc/nginx nginx:1.25 ls /etc/nginx
    # 能看到镜像中 /etc/nginx 的初始文件
    docker run --rm -v nginx_conf:/etc/nginx nginx:1.25 cat /etc/nginx/nginx.conf
    # 内容是镜像自带的默认配置
    ```
  - 应用：可用于"提取镜像默认配置"——把空卷挂到镜像目录，再用另一容器 `docker cp` 出来。
- 考点：volume 初始化机制、与 bind mount 的差异。难度：★★★

**Q10：【来源 docs.docker.com/storage/bind-mounts/】bind mount 挂载的主机路径不存在时，Docker 默认行为是什么？如何避免？**
- 答案（依据 https://docs.docker.com/storage/bind-mounts/）：
  - 默认行为：
    - 使用 `-v` 时，若主机路径不存在，Docker **自动创建**该路径（属主 root，权限 755），且不报错。这常导致"以为挂载了已有数据，实际挂载了空目录"。
    - 使用 `--mount type=bind` 时，若主机路径不存在，Docker **报错** `error: bind source path does not exist`，容器启动失败。
  - 避免方式：
    1. 生产脚本统一用 `--mount type=bind`，让路径缺失尽早暴露。
    2. 在 `docker run` 前显式 `mkdir -p` 并校验路径存在。
    3. CI/CD 中加 `test -d /host/path || exit 1` 前置检查。
  - 注意：自动创建的目录属主是 root，可能导致后续权限问题（见陷阱 4）。
- 考点：bind mount 路径处理、`-v` vs `--mount` 错误行为差异。难度：★★★

#### 【实战题】

**Q11：项目场景——把生产 MySQL 数据从单机迁移到新主机，要求零数据丢失，写出完整步骤。**
- 答案：
  - 方案：用命名卷 + 备份/恢复 + 应用层切换。
  ```bash
  # 1. 源主机：停写（让应用切到只读或暂停），等待 binlog 同步
  docker exec src-mysql mysql -uroot -p -e "FLUSH TABLES WITH READ LOCK;"

  # 2. 备份卷数据到主机 tar 包（不需要停容器）
  docker run --rm -v mysql_data:/data:ro -v /backup:/backup alpine \
    tar czf /backup/mysql-$(date +%Y%m%d).tar.gz -C /data .

  # 3. 传输到新主机
  scp /backup/mysql-20260702.tar.gz new-host:/backup/

  # 4. 新主机：创建空命名卷并恢复
  docker volume create mysql_data
  docker run --rm -v mysql_data:/data -v /backup:/backup alpine \
    tar xzf /backup/mysql-20260702.tar.gz -C /data

  # 5. 新主机：启动 MySQL 容器挂载恢复后的卷
  docker run -d --name new-mysql \
    --mount type=volume,src=mysql_data,dst=/var/lib/mysql \
    -e MYSQL_ROOT_PASSWORD=secret \
    -p 3306:3306 \
    mysql:8.0

  # 6. 验证：连接 new-mysql 检查数据量与最近一条记录
  docker exec new-mysql mysql -uroot -p -e "SELECT COUNT(*) FROM orders.order;"

  # 7. 切换应用连接串到新主机，观察一段时间后下线源容器
  ```
  - 最佳实践：
    - 备份前 `FLUSH TABLES WITH READ LOCK` 或用 `mysqldump --single-transaction` 保证一致性。
    - 大数据量用 `mysqldump` 太慢，直接 tar 卷文件更快（InnoDB 文件可热备，但建议配合 binlog 位点）。
    - 跨版本迁移需先 `mysql_upgrade`；同版本同架构直接拷卷最稳。
    - 切换前后都校验 row count 与 binlog 位点（`SHOW MASTER STATUS`）。
- 考点：卷备份恢复、数据库迁移、零丢失实践。难度：★★★★★

**Q12：项目场景——开发一个 Node.js 应用，希望主机改代码容器内立即生效，写出本地开发环境的挂载方案，并说明热重载失效的可能原因。**
- 答案：
  - 方案：用 bind mount 把主机源码目录挂到容器内工作目录，配合 nodemon 监听文件变化。
  ```bash
  docker run -d --name node-dev \
    --mount type=bind,src=/Users/work1/Documents/ontion/webapp,dst=/app \
    -w /app \
    -p 3000:3000 \
    node:20-alpine \
    npx nodemon --legacy-watch index.js
  ```
  - 关键点：
    - `--legacy-watch`：在 macOS/Windows 上强制用轮询模式，因为 bind mount 跨虚拟机边界时 inotify 事件可能丢失。
    - 也可在 `nodemon.json` 中配 `"legacy-watch": true`。
  - 热重载失效的常见原因：
    1. **macOS bind mount 不传 inotify**：升级 VirtioFS 或开 `--legacy-watch` 轮询。
    2. **挂载路径错位**：源码在 `/app/src`，但 nodemon 监听 `/app`，子目录新增文件未触发。
    3. **node_modules 在主机**：主机无 macOS 版依赖，容器用 Linux 版依赖；推荐用匿名卷覆盖 `/app/node_modules`：
       ```bash
       docker run -d --name node-dev \
         --mount type=bind,src=$PWD/webapp,dst=/app \
         --mount type=volume,dst=/app/node_modules \
         ...
       ```
    4. **文件保存时 IDE 没真正写入**：用 atomic write 的编辑器会先写临时文件再 rename，可能绕过监听。
  - 最佳实践：开发环境用 Docker Compose 声明挂载 + 命名卷覆盖 node_modules，配合 `chokidar` 轮询兜底。
- 考点：bind mount 开发场景、热重载、node_modules 卷覆盖。难度：★★★★

**Q13：批量清理 dangling 卷并审计所有命名卷的挂载点，写出命令。**
- 答案：
  ```bash
  # 1. 列出所有 dangling 卷（未被任何容器引用）
  docker volume ls -f dangling=true

  # 2. 清理 dangling 卷（仅匿名 dangling，安全）
  docker volume prune -f

  # 3. 强制清理所有未被引用的卷（含命名卷，慎用！会删命名卷）
  docker volume prune -f --all

  # 4. 审计所有命名卷及其挂载点
  docker volume ls -q | xargs -I {} docker volume inspect {} \
    -f '{{.Name}} {{.Mountpoint}} {{.Driver}} {{.Labels}}'

  # 5. 查找哪些容器在使用某卷
  docker ps -a --format '{{.Names}}' | xargs -I {} sh -c \
    'docker inspect {} -f "{{json .Mounts}}" | grep -q "pg_data" && echo {}'

  # 6. 按标签筛选（创建卷时打标）
  docker volume create --label env=prod --label app=pg pg_data
  docker volume ls -f label=env=prod
  ```
  - 注意：
    - `docker volume prune` 默认只清 dangling（未被任何容器引用的匿名卷）。
    - 加 `--all` 会清所有 dangling 卷（含命名卷），生产慎用，建议先 `docker volume ls -f dangling=true` 人工核对。
    - 关键数据卷创建时打 label，便于审计与批量筛选。
- 考点：卷清理、审计、标签管理。难度：★★★

---

### 项目常用场景

**场景1：MySQL 数据库持久化与备份**
- 背景：生产 MySQL 容器化，要求容器重建后数据不丢，且每周全量备份、每天增量备份。
- 解决方案：
  ```bash
  # 1. 启动 MySQL 用命名卷持久化数据
  docker volume create --label app=mysql --label env=prod mysql_data
  docker run -d --name mysql \
    --restart unless-stopped \
    --mount type=volume,src=mysql_data,dst=/var/lib/mysql \
    -e MYSQL_ROOT_PASSWORD=$(cat /run/secrets/mysql_root) \
    -e MYSQL_DATABASE=orders \
    -p 3306:3306 \
    --memory=4g --cpus=2 \
    mysql:8.0

  # 2. 每周全量备份（用临时容器挂载卷 + mysqldump）
  docker run --rm \
    --mount type=volume,src=mysql_data,dst=/var/lib/mysql,readonly \
    mysql:8.0 \
    mysqldump -uroot -p"$PWD" --single-transaction --routines --triggers orders \
    > /backup/orders-$(date +%Y%m%d).sql

  # 3. 直接备份卷文件（更快，适合大数据量）
  docker run --rm \
    --mount type=volume,src=mysql_data,dst=/data,readonly \
    -v /backup:/backup alpine \
    tar czf /backup/mysql-vol-$(date +%Y%m%d).tar.gz -C /data .

  # 4. binlog 增量备份（按时间点恢复）
  docker exec mysql mysql -uroot -p"$PWD" -e "SHOW MASTER STATUS;"
  # 记录 binlog 文件与 position，定期归档 binlog 文件

  # 5. 自动化（crontab -e）
  0 3 * * 0  /opt/backup/mysql-full.sh
  0 3 * * 1-6 /opt/backup/mysql-binlog.sh
  ```
- 最佳实践：
  - 用命名卷而非 bind mount，权限由 Docker 管理避免 UID 999 与主机冲突。
  - 密码用 `--env-file` 或 Docker Secret，不写在命令行。
  - 备份脚本定期演练恢复（备份不验证等于没备份）。
  - 大数据量用 Percona XtraBackup 物理热备，比 mysqldump 快几个数量级。

**场景2：本地开发源码热重载 + node_modules 隔离**
- 背景：Node.js / Python 项目本地开发，希望主机编辑代码容器内立即热重载，但依赖（node_modules / venv）不应被主机文件覆盖。
- 解决方案：
  ```yaml
  # docker-compose.dev.yml
  services:
    app:
      image: node:20-alpine
      working_dir: /app
      command: npx nodemon --legacy-watch index.js
      ports: ["3000:3000"]
      volumes:
        # 源码 bind mount，热重载
        - type: bind
          source: ./webapp
          target: /app
        # 匿名卷覆盖 node_modules，用容器内 Linux 版依赖
        - type: volume
          target: /app/node_modules
      environment:
        NODE_ENV: development
  ```
  ```bash
  docker compose -f docker-compose.dev.yml up
  ```
- 关键点：
  - **匿名卷覆盖**：在 bind mount 之上再挂一个匿名卷到 `/app/node_modules`，容器内依赖不受主机影响（主机可能无依赖或为 macOS 版）。
  - **--legacy-watch**：macOS bind mount 不传 inotify，nodemon 需开轮询。
  - **缓存卷**：可对 `.cache`、`.next` 等构建产物同样用匿名卷隔离。
- 最佳实践：
  - 开发与生产用不同 Compose 文件，开发用 bind mount + 匿名卷，生产用命名卷。
  - 用 `.dockerignore` 排除 `node_modules`、`.git` 防止构建镜像时被复制。
  - Windows/macOS 上对大项目评估 VirtioFS 性能，必要时用 docker-sync。

**场景3：命名卷数据备份与跨主机迁移**
- 背景：业务容器从主机 A 迁移到主机 B，数据存于命名卷，要求零丢失、最小停机。
- 解决方案（卷级 tar 备份 + scp 恢复）：
  ```bash
  # 主机 A：停容器（或只读模式）保证一致性
  docker stop app

  # 备份命名卷为 tar
  docker run --rm \
    --mount type=volume,src=app_data,dst=/data,readonly \
    -v /backup:/backup alpine \
    tar czf /backup/app_data-$(date +%Y%m%d).tar.gz -C /data .

  # 传输到主机 B
  scp /backup/app_data-20260702.tar.gz user@hostB:/backup/

  # 主机 B：创建空卷并恢复
  docker volume create app_data
  docker run --rm \
    --mount type=volume,src=app_data,dst=/data \
    -v /backup:/backup alpine \
    tar xzf /backup/app_data-20260702.tar.gz -C /data

  # 主机 B：启动容器
  docker run -d --name app \
    --mount type=volume,src=app_data,dst=/data \
    app:1.0
  ```
- 替代方案：
  - **NFS 共享卷**：两个主机都挂同一 NFS 卷，无需迁移数据，但需评估网络延迟。
  - **卷 driver（RexRay/Portworx）**：分布式存储，卷可跨主机漂移，配合编排系统自动迁移。
  - **rsync 同步**：`docker run --rm -v app_data:/data alpine rsync -av /data/ user@hostB:/path/`，但需注意权限。
- 最佳实践：
  - 备份前停容器或切只读，保证文件系统一致性。
  - 大卷用 `pigz`（多线程 gzip）或 `zstd` 加速。
  - 恢复后用应用层校验（row count、文件 hash）确认完整性。
  - 长期方案上分布式存储或对象存储，避免主机级单点。

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|----------|----------|
| **volume（命名卷）** | **bind mount** | volume 由 Docker 管理在 `/var/lib/docker/volumes/`，独立于主机路径，跨平台一致，首次挂载会初始化镜像数据；bind mount 直接挂主机绝对路径，主机路径必须存在（或被自动创建），不初始化 | 生产数据用 volume；开发源码/配置注入用 bind mount |
| **bind mount** | **tmpfs** | bind mount 落盘到主机文件系统，持久化；tmpfs 落主机内存，容器停即销毁，仅 Linux | 持久数据/配置用 bind mount；敏感临时数据/内存级 IO 用 tmpfs |
| **命名卷** | **匿名卷** | 命名卷有可读名称（如 `pg_data`），便于管理与共享；匿名卷是一长串哈希名，容器删除后易成 dangling 被误清理 | 所有生产数据用命名卷；匿名卷仅用于一次性临时挂载（如覆盖 node_modules） |
| **`-v` / `--volume`** | **`--mount`** | `-v` 三段式 `src:dst:opts` 隐式推断类型；`--mount` 键值对显式声明 `type=...`，错误更早暴露 | Compose 短语法/历史脚本用 `-v`；生产脚本、CI/CD 推荐 `--mount` |
| **`:ro`** | **`:rw`** | `:ro` 只读挂载，容器内无法写入（保护主机文件）；`:rw`（默认）可读写 | 配置文件、静态资源用 `:ro`；数据目录用 `:rw` |
| **容器可写层** | **volume** | 可写层与容器同生命周期，CoW 性能差，容器删即丢；volume 独立生命周期，由 Docker 管理，性能与主机文件系统一致 | 临时/无状态数据可写层；任何持久化数据用 volume |
| **`--volumes-from`** | **命名卷共享** | `--volumes-from` 隐式继承某容器的所有挂载（已弃用，耦合高）；命名卷共享是显式声明同一卷被多容器挂载 | 新项目用命名卷共享；老项目兼容才用 `--volumes-from` |
| **bind mount `:z`** | **`:Z`** | `:z` 打 SELinux 共享标签（多容器可访问）；`:Z` 打私有标签（仅当前容器） | 多容器共享目录用 `:z`；单容器独占用 `:Z` |

---

### 常见陷阱与坑点

**陷阱1：相对路径被当作命名卷**
- 现象：`docker run -v ./app:/app node` 后，主机 `./app` 目录没被挂载，容器内 `/app` 是空目录，但 docker 没报错。
- 原因：`-v` 语法中，源字段**以 `/` 开头**才是 bind mount；`./app` 不以 `/` 开头，被当作**命名卷名**（卷名 `app`，存于 `/var/lib/docker/volumes/app/_data`）。
- 解决：① 用绝对路径 `-v /Users/work1/Documents/ontion/app:/app`；② 或改用 `--mount type=bind,src=$PWD/app,dst=/app` 显式声明。
- 预防：生产脚本统一 `--mount`，并 `echo $PWD` 校验路径。

**陷阱2：匿名卷堆积导致磁盘占用**
- 现象：`docker ps -a` 容器不多，但 `docker system df` 显示卷占几十 GB；`docker volume ls` 列出一堆哈希名卷。
- 原因：Dockerfile 中 `VOLUME /var/lib/...` 指令或 `docker run -v /var/lib/...`（不带卷名）会创建匿名卷，容器删除时**默认不删**匿名卷，长期累积成 dangling。
- 解决：
  ```bash
  docker volume ls -f dangling=true                 # 列出 dangling 卷
  docker volume prune -f                            # 清理 dangling 匿名卷（安全）
  docker volume prune -f --all                      # 含命名卷（慎用）
  ```
- 预防：① 避免在 Dockerfile 中滥用 `VOLUME` 指令；② `docker run` 用命名卷或 `--rm` 让匿名卷随容器销毁；③ 定期 `docker volume prune` 与监控 `docker system df -v`。

**陷阱3：bind mount 主机路径不存在被自动创建**
- 现象：`docker run -v /opt/missing:/data app` 期望挂载已有数据，结果容器内 `/data` 是空目录，主机 `/opt/missing` 被新建（属主 root）。
- 原因：`-v` 在主机路径不存在时**静默创建**空目录，不报错。
- 解决：① 改用 `--mount type=bind,src=/opt/missing,dst=/data`，路径不存在会**报错**；② 启动前 `test -d /opt/missing || exit 1` 校验。
- 预防：CI/CD 与生产脚本统一 `--mount`，让"路径错误"这类问题尽早暴露。

**陷阱4：bind mount 权限错乱（容器内 root 写入主机目录变 root 属主）**
- 现象：开发用 `docker run -v $PWD/app:/app node` 跑容器，主机 `app/` 下新建文件属主变成 root，主机用户无法读取/删除。
- 原因：容器内进程默认以 root（UID 0）运行，写入文件的属主自然是 root；容器与主机共享数字 UID 空间。
- 解决：
  ```bash
  # 运行时指定 UID
  docker run -u $(id -u):$(id -g) -v $PWD/app:/app node

  # 或构建镜像时创建匹配用户
  # Dockerfile: RUN useradd -u 1000 -m appuser && USER appuser

  # 或事后修复
  sudo chown -R $USER:$USER ./app
  ```
- 预防：开发环境统一 `-u $(id -u):$(id -g)`；生产用非 root 镜像或 rootless Docker。

**陷阱5：SELinux 系统下 bind mount 报 Permission denied**
- 现象：CentOS/RHEL 上 `docker run -v /host/app:/app app`，容器内访问 `/app` 报 `Permission denied`，但 `ls -l` 权限看着没问题。
- 原因：SELinux 强制访问控制给文件打标签，主机目录默认标签不被容器进程允许访问。
- 解决：`-v /host/app:/app:z`（共享标签）或 `:Z`（私有标签）；或 `chcon -Rt container_file_t /host/app`。
- 预防：SELinux 系统上所有 bind mount 默认加 `:z`（多容器共享）或 `:Z`（单容器独占）。

**陷阱6：命名卷首次挂载"消失"的镜像数据**
- 现象：第二次用同一命名卷挂到不同镜像（如 nginx 换成 httpd），发现挂载点是上一个镜像留下的文件，而不是新镜像的默认配置。
- 原因：命名卷**首次挂载**时才会从镜像复制初始数据；一旦卷非空，后续挂载直接用卷内现有内容，镜像中目标目录的内容被遮蔽。
- 解决：① 切换镜像时若需重新初始化，先 `docker volume rm` 删除旧卷再创建空卷；② 或在容器内手动 `cp /etc/nginx/nginx.conf.default /etc/nginx/nginx.conf`。
- 预防：理解 volume 初始化只在"空卷首次挂载"时发生；不同应用不要复用同一卷。

---

### 实践信号

#### 官方进阶文档
- **Docker storage 官方总览**：https://docs.docker.com/storage/ - 学习重点：三种存储类型的对比与选用决策树，是本章的权威依据。
- **Volumes 详细文档**：https://docs.docker.com/storage/volumes/ - 学习重点：命名卷的创建、初始化机制（populate）、NFS 卷创建示例、卷 driver 机制。
- **Bind mounts 详细文档**：https://docs.docker.com/storage/bind-mounts/ - 学习重点：bind mount 的 `--mount` 与 `-v` 语法对照、路径不存在时的行为差异、只读挂载。
- **tmpfs mounts 详细文档**：https://docs.docker.com/storage/tmpfs/ - 学习重点：tmpfs 的限制（仅 Linux、单容器）、`tmpfs-size` 与 `tmpfs-mode` 选项。
- **Backup, restore, or migrate data volumes**：https://docs.docker.com/storage/volumes/#back-up-restore-or-migrate-data-volumes - 学习重点：官方推荐的 tar 备份恢复流程。

#### 社区热议话题
- **bind mount 权限问题（UID/GID 映射）**：Stack Overflow 上 `docker bind mount permission denied` 是常青问题，社区方案包括 `-u` 指定、rootless Docker、命名卷替代。讨论核心是容器与主机共享数字 UID 空间这一底层事实。
- **macOS bind mount 性能**：Docker Desktop GitHub issue 与 Reddit r/docker 持续讨论 VirtioFS vs gRPC-FUSE vs osxfs 的性能对比，4.6+ 版本后 VirtioFS 成为默认推荐。开发者社区普遍用 docker-sync / Mutagen 缓解大项目性能问题。
- **匿名卷堆积与清理**：Docker Forums 与 Stack Overflow 大量"docker volume prune 是否安全"的讨论，社区共识是默认 prune 只清匿名 dangling 卷，加 `--all` 才清命名卷，生产慎用。
- **`-v` 相对路径陷阱**：Stack Overflow 上 `docker volume name with relative path` 类问题反复出现，社区强烈推荐迁移到 `--mount` 语法。

#### 动手验证
1. **观察 volume 初始化 vs bind mount 不初始化**：
   ```bash
   # 命名卷首次挂载会复制镜像内文件
   docker volume create test-vol
   docker run --rm --mount type=volume,src=test-vol,dst=/etc/nginx nginx:1.25 \
     ls /etc/nginx
   # 看到 nginx.conf 等镜像自带文件

   # 验证卷内确实有这些文件
   docker run --rm --mount type=volume,src=test-vol,dst=/data alpine ls /data

   # 对比：bind mount 不复制，主机空目录遮蔽镜像内容
   mkdir /tmp/empty-bind
   docker run --rm --mount type=bind,src=/tmp/empty-bind,dst=/etc/nginx nginx:1.25 \
     ls /etc/nginx
   # 看到 /etc/nginx 是空的（被主机空目录遮蔽）

   docker volume rm test-vol
   ```

2. **复现并修复 bind mount 权限问题**：
   ```bash
   # 1. 用 root 容器写入主机目录，观察属主
   mkdir /tmp/perm-test && chmod 777 /tmp/perm-test
   docker run --rm -v /tmp/perm-test:/data alpine sh -c 'echo hi > /data/file'
   ls -l /tmp/perm-test/file    # 属主是 root

   # 2. 用主机 UID 运行，再观察
   docker run --rm -u $(id -u):$(id -g) -v /tmp/perm-test:/data alpine \
     sh -c 'echo hi2 > /data/file2'
   ls -l /tmp/perm-test/file2   # 属主是当前用户

   rm -rf /tmp/perm-test
   ```

3. **完整演练卷备份与恢复**：
   ```bash
   # 1. 创建命名卷并写入数据
   docker volume create backup-demo
   docker run --rm --mount type=volume,src=backup-demo,dst=/data alpine \
     sh -c 'echo "important data" > /data/file.txt'

   # 2. 备份卷
   docker run --rm \
     --mount type=volume,src=backup-demo,dst=/data,readonly \
     -v /tmp:/backup alpine \
     tar czf /backup/backup-demo.tar.gz -C /data .

   # 3. 删除原卷
   docker volume rm backup-demo

   # 4. 创建空卷并恢复
   docker volume create backup-demo
   docker run --rm \
     --mount type=volume,src=backup-demo,dst=/data \
     -v /tmp:/backup alpine \
     tar xzf /backup/backup-demo.tar.gz -C /data

   # 5. 验证数据
   docker run --rm --mount type=volume,src=backup-demo,dst=/data alpine cat /data/file.txt
   # 输出: important data

   docker volume rm backup-demo && rm /tmp/backup-demo.tar.gz
   ```

4. **对比 -v 与 --mount 对路径不存在的处理**：
   ```bash
   # -v 静默创建空目录
   docker run --rm -v /tmp/not-exist-v:/data alpine ls /data
   ls -ld /tmp/not-exist-v   # 被自动创建了
   rmdir /tmp/not-exist-v

   # --mount 报错
   docker run --rm --mount type=bind,src=/tmp/not-exist-mount,dst=/data alpine ls /data
   # 报错: bind source path does not exist
   ```

---

## 章节小结

本章覆盖了 Docker 数据持久化与存储的完整体系：从理解容器可写层与写时复制（CoW）的局限，到三种存储类型（volume / bind mount / tmpfs）的对比与选用，再到 `-v` 与 `--mount` 两套语法的差异、卷的存储位置与 driver 机制、卷的备份/恢复/迁移、容器间数据共享，以及最棘手的 UID/GID 权限问题。

生产实践中最关键的四个要点：
1. **三种存储类型各司其职**：生产数据用命名卷（Docker 管理、独立生命周期、可换 driver）；开发源码热重载用 bind mount；敏感临时数据用 tmpfs。绝不把有状态数据写在容器可写层。
2. **统一使用 `--mount` 语法**：显式声明 `type=...` 避免 `-v` 的隐式推断陷阱（相对路径被当命名卷、主机路径不存在被静默创建），让错误尽早暴露。
3. **权限问题前置规划**：容器与主机共享数字 UID 空间，bind mount 必然遇到权限冲突；开发用 `-u $(id -u):$(id -g)`，生产用非 root 镜像 + rootless Docker，SELinux 系统加 `:z`/`:Z` 标签。
4. **卷的备份与迁移要演练**：命名卷虽独立于容器，但仍可能因 `docker volume prune --all` 误删或主机故障丢失；关键数据定期 tar 备份 + 演练恢复，长期方案上 NFS/分布式 driver 或对象存储。

理解存储的本质：volume 是 Docker 管理的目录、bind mount 是主机路径的直通、tmpfs 是内存的临时挂载——三者都是绕过容器可写层让数据获得独立生命周期的机制。命令背后的 UID 映射、SELinux 标签、storage driver 与卷 driver 才是排查问题的根。
