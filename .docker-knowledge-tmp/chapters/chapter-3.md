## 第3章 核心概念：镜像、容器与分层

### 核心知识点

> 本章是 Docker 的「理论地基」。镜像、容器、分层三者构成一条递进链：镜像是只读模板，容器是镜像的可写实例，分层是二者共用的存储机制。真正理解分层与 Copy-on-Write，才能解释「为什么磁盘只占一份」「为什么容器删了数据没了」「为什么构建顺序影响镜像大小」等所有后续问题。

**镜像（Image）的本质**
- 概念解释：镜像是一个**只读的、分层的、内容寻址的**文件系统模板，包含运行应用所需的全部文件（代码、运行时、库、配置）与元数据。它本身不是单个文件，而是一组按序堆叠的 layer 加一份 config（JSON 元数据）。
- 核心作用：把「环境」固化成可分发、可复现、可校验的制品，解决「在我机器上能跑」问题。
- 基本用法：
  ```bash
  docker images                          # 列出本地镜像
  docker image inspect nginx:1.27        # 查看 config 与各层 digest
  docker image history nginx:1.27        # 查看每一层构建指令与大小
  docker pull nginx:1.27-alpine          # 显式指定 tag
  docker pull nginx@sha256:6af79ae5d4... # 用 digest 锁定具体内容
  ```
- 注意事项：镜像**不可变**，任何修改都生成新镜像（新层）；`latest` 是个 tag 不是版本号，可能被覆盖；同一内容寻址 ID 的镜像在本地只存一份。

**容器（Container）的本质与可写层**
- 概念解释：容器是镜像的一个**运行实例**，在镜像所有只读层之上额外叠加一层**可写层（container layer / writable layer）**。所有对容器的写操作（新建文件、修改、删除）都落在这层，绝不回写镜像。
- 核心作用：让「同一镜像跑 N 份互不干扰」成为可能——N 个容器共享只读层，各自维护薄薄的可写层，存储成本几乎不增加。
- 基本用法：
  ```bash
  docker run -d --name app1 nginx:1.27
  docker run -d --name app2 nginx:1.27    # 与 app1 共享镜像层，磁盘几乎不增加
  docker exec app1 sh -c 'echo hi > /tmp/x'   # 写入可写层
  docker diff app1                        # 查看可写层相对镜像的改动（A/C/D）
  ```
- 注意事项：**容器删除即丢失可写层**——这是「数据丢了」最常见的根因，持久数据必须用 volume 或 bind mount；可写层默认用 OverlayFS 的 upperdir 实现，性能低于直接读写卷；`docker cp` 拷出文件不会保留可写层。

**分层存储（Layer）与 Copy-on-Write**
- 概念解释：镜像由多个 **layer** 顺序堆叠，每个 layer 对应 Dockerfile 中一条会改文件系统的指令（`RUN`/`COPY`/`ADD`，以及 `FROM` 引入的基镜层）。多个镜像共享相同底层（如都基于 `alpine`）时，磁盘上只存一份。**Copy-on-Write（CoW）** 指：容器读文件时按层从上往下查找，命中即读；首次修改时才把文件从下层复制到可写层再改，避免改动只读层。
- 核心作用：分层带来**存储复用**（共享层）、**构建缓存**（指令未变复用缓存层）、**分发增量**（pull/push 只传缺失层），是 Docker 性能与效率的根基。
- 基本用法：
  ```bash
  docker image history redis:7           # 每行一个 layer，显示 CREATED BY 指令
  docker image inspect redis:7 --format '{{json .RootFS.Layers}}'
  # 观察共享层：拉两个共享 base 的镜像，看 /var/lib/docker 大小变化
  docker pull alpine:3.20
  docker pull nginx:1.27-alpine          # 只下载多出来的层
  ```
- 注意事项：CoW 的「首次写复制」对大文件有性能惩罚（如日志文件、数据库数据文件），应挂载到 volume；删除下层文件其实是在上层创建一个 **whiteout 文件**「遮住」它，磁盘空间并不立即释放；层越多镜像越胖，应合理合并指令。

**OverlayFS 存储驱动**
- 概念解释：`overlay2` 是 Docker 25.x 在 Linux 上的默认存储驱动，基于内核 OverlayFS。它把镜像各层作为 **lowerdir**（只读，可多层）、容器可写层作为 **upperdir**（可写，单层），合并挂载出一个统一视图的 **merged** 目录。
- 核心作用：用内核原生联合文件系统高效实现分层与 CoW，相比早期的 `aufs`/`devicemapper` 更稳定、性能更好、已进入主线内核。
- 基本用法：
  ```bash
  docker info | grep -i "storage driver"   # 通常是 Storage Driver: overlay2
  # 查看某容器的 OverlayFS 四元组
  docker inspect <cid> --format '{{.GraphDriver.Data}}'
  # 在宿主机查看（Linux 原生部署）
  ls /var/lib/docker/overlay2/<id>/        # diff/ work/ merged/ link
  ```
- 注意事项：OverlayFS 要求内核 ≥ 3.18（现代发行版均满足）；Mac/Windows 上 Docker Desktop 在 LinuxKit VM 内仍是 overlay2，宿主机看不到；`vfs` 驱动无 CoW、每层全量拷贝，仅用于不支持 overlay 的环境，磁盘占用爆炸；不支持在镜像层上做「修改」，只能新增层。

**镜像标识四件套：ID / Name / Tag / Digest**
- 概念解释：
  - **Image ID**：镜像 config JSON 的 sha256 哈希（前 12 位常用于显示，完整 64 位），**内容寻址**，同内容必同 ID。
  - **Name**：仓库地址 `registry/repo`（如 `docker.io/library/nginx`），仅是「名字标签」。
  - **Tag**：可变的人类可读标签（如 `1.27`、`alpine`、`latest`），**可被覆盖**，不保证内容稳定。
  - **Digest**：manifest 的 sha256（`sha256:...`），**内容寻址且不可变**，是锁定「确切这一份镜像」的唯一可靠方式。
- 核心作用：区分「名字（可变）」与「内容（不可变）」是镜像可复现分发的关键，生产环境必须用 digest 而非 tag 锁定版本。
- 基本用法：
  ```bash
  docker images --digests nginx          # 同时显示 Tag 与 Digest
  docker pull nginx@sha256:6af79ae5d4... # digest 拉取，必定得到同一内容
  docker image ls --no-trunc             # 显示完整 Image ID
  ```
- 注意事项：同一 Image ID 可有多个 tag（`nginx:1.27` 与 `nginx:latest` 指向同一 ID 是常态）；`docker images` 显示的 `<none>:<none>` 即「悬空镜像」——有 ID 无 tag；Tag 可被仓库覆盖，今天 `1.27` 与明天 `1.27` 可能内容不同，供应链安全要求用 digest。

**镜像拉取/推送流程：manifest / config / blob**
- 概念解释：OCI/Docker Registry 协议下，一个镜像由三类对象组成：
  - **manifest**：清单（JSON），列出 config 的 digest 和每个 layer 的 digest，是「目录」。
  - **config**：镜像配置（JSON），含环境变量、入口命令、架构、各层历史等，其 sha256 即 Image ID。
  - **blob**：层文件（gzip 压缩的 tar），实际文件内容，按 digest 存于 registry 的 blob store。
  pull 流程：拉 manifest → 按 digest 拉 config → 逐个按 digest 拉 blob（已存在则跳过）。push 反之。
- 核心作用：内容寻址 + 清单驱动，使得「按需拉取」「层复用」「完整性校验」三者天然成立。
- 基本用法：
  ```bash
  # 直接调 registry API 观察 manifest
  curl -H 'Accept: application/vnd.oci.image.manifest.v1+json' \
    https://registry-1.docker.io/v2/library/nginx/manifests/1.27
  # docker pull 增量调试
  docker pull nginx:1.27-alpine   # 第二次拉取会看到已存在层: Already exists
  docker push myrepo/app:v1       # 只 push 本地缺失于 registry 的层
  ```
- 注意事项：manifest 有 v2 schema 1（已淘汰）、schema 2、OCI 三种格式，25.x 默认产生 OCI；多架构镜像（manifest list / index）指向多个单架构 manifest，`docker pull` 会按当前架构自动选；digest 是对 manifest 内容的哈希，故改 tag 不改 digest，改任何层则 digest 必变。

**容器生命周期：created → running → paused → stopped → deleted**
- 概念解释：容器有 5 个核心状态：
  - `created`：已创建（分配了 ID、可写层、网络配置）但未启动进程。
  - `running`：进程在运行。
  - `paused`：用 `cgroup freezer` 冻结容器内所有进程，内存保留，CPU 不调度。
  - `stopped`（exited）：主进程退出，可写层仍保留在磁盘，可 `start` 重启。
  - `deleted`：`docker rm` 后可写层被删除，数据彻底丢失。
- 核心作用：理解状态机才能正确选择 `stop`/`pause`/`kill`/`rm`，避免误删数据。
- 基本用法：
  ```bash
  docker create --name web nginx:1.27     # created
  docker start web                         # → running
  docker pause web                         # → paused
  docker unpause web                       # → running
  docker stop web                          # → stopped（先 SIGTERM，10s 后 SIGKILL）
  docker rm web                            # → deleted
  docker rm -f web                         # running 也强删（先 kill 再 rm）
  ```
- 注意事项：`pause` ≠ `stop`——pause 不发信号、进程不退出、重启不丢；stop 是优雅退出；`docker restart` = stop + start；`docker kill` 直接发 SIGKILL 不给清理机会；只有 `rm` 才释放可写层，stop 后容器仍占磁盘。

**内容寻址与可信分发（DCT / Cosign）**
- 概念解释：内容寻址（content-addressable）指用内容哈希（sha256）作为唯一标识，内容变则哈希变，天然防篡改。**Docker Content Trust (DCT / Notary v1)** 用 ECDSA 对 manifest 签名，pull/push 时通过 `DOCKER_CONTENT_TRUST=1` 强制校验。**Cosign**（Sigstore 项目）是新一代 OCI 签名方案，把签名作为独立对象存于 registry，支持透明日志 Rekor、密钥无状态化，已逐步取代 Notary v1。
- 核心作用：在镜像分发链路上提供「这是我构建的、未被篡改的」可验证证据，是供应链安全（SLSA）的核心组件。
- 基本用法：
  ```bash
  # DCT（传统）
  DOCKER_CONTENT_TRUST=1 docker pull myrepo/app:1.0
  docker trust sign myrepo/app:1.0
  docker trust inspect myrepo/app:1.0

  # Cosign（现代）
  cosign sign --key cosign.key myrepo/app:1.0
  cosign verify --key cosign.pub myrepo/app:1.0
  cosign sign --identity-token $OIDC_TOKEN myrepo/app:1.0  # keyless，基于 OIDC
  ```
- 注意事项：DCT 在 25.x 仍支持但社区重心已转向 OCI 签名（Cosign/Notation）；DCT 只签名 manifest，不签名 config/blob 的独立完整性（虽 manifest 内含其 digest）；keyless 签名依赖 Sigstore 公共 Rekor 日志，离线环境需自建；`docker pull` 默认不校验签名，需策略（如 policy.json）强制。

---

### 章节题目

#### 【面试题】
**Q1（基础）**：为什么 100 个基于同一 nginx 镜像的容器，磁盘占用接近 1 份镜像而非 100 份？
- 答案：因为镜像层对所有容器**只读共享**，每个容器只在镜像之上叠加一层薄薄的可写层（OverlayFS 的 upperdir）。100 个容器共享同一组 lowerdir（镜像层），各自独立维护自己的 upperdir。读时所有容器看到同一份镜像文件，写时通过 Copy-on-Write 把要改的文件复制到自己的可写层。所以总占用 ≈ 镜像大小 + 100 × 可写层增量。
- 考点：分层共享 + 可写层 + CoW 三者联动；区分「镜像层共享」与「数据隔离」。

**Q2（进阶）**：`docker pull nginx:1.27` 今天和昨天拉到的镜像内容可能不同吗？如何保证两次拉到完全相同的内容？
- 答案：可能不同。`1.27` 是可变 tag，仓库维护者可以重新构建并覆盖该 tag（如打安全补丁）。要保证完全一致，应使用 **digest** 拉取：`docker pull nginx@sha256:<固定digest>`。digest 是 manifest 内容的 sha256，内容变则 digest 变，故 digest 拉取是内容寻址的，必定得到同一份内容。可在 `docker images --digests` 或 registry API 中获取 digest。
- 考点：Tag vs Digest 的本质区别；内容寻址的可复现性。

**Q3（深度）**：容器里 `rm` 一个来自镜像层的文件，磁盘空间会立即释放吗？为什么？
- 答案：不会。镜像层是只读的，`rm` 实际是在容器的可写层创建一个 **whiteout 文件**（OverlayFS 中是 character device 0/0），「遮住」下层同名文件。下层原始文件仍存在于镜像层中，被其他容器或镜像共享，不会被删除。所以从该容器视图看文件没了，但磁盘空间未释放。要真正减小镜像体积，必须在构建镜像时删除（且在同一层删除或使用多阶段构建，避免下层仍保留）。
- 考点：whiteout 机制、CoW 的「删除」语义、层不可变。

#### 【论坛题】
**Q4（基础）** —— Stack Overflow #25377908：What is the difference between a Docker image and a container?
- 答案：**Image** 是只读的分层模板（一组 layer + config），存在 `/var/lib/docker/overlay2/`，可被 push/pull/tag；**Container** 是镜像的运行实例，= 镜像只读层 + 一个可写层 + namespace 隔离的进程 + cgroup 资源限制。类比：Image 是类（class），Container 是实例（object）。`docker ps` 看容器，`docker images` 看镜像；同一 image 可起多个 container。
- 考点：基本概念区分；类比例比的理解。

**Q5（进阶）** —— Stack Overflow #43498022：Why does my Docker image size not decrease after I `rm` files in a later `RUN`?
- 答案：因为每一层是独立 tar 包，下层 `RUN` 安装的文件已经固化在那个层里，后续 `RUN rm` 在新层创建 whiteout 遮住文件，但下层 tar 仍包含原文件，push/pull 时仍会传输。镜像大小是各层大小之和。正确做法：在同一 `RUN` 中清理（如 `RUN apt-get install -y foo && rm -rf /var/lib/apt/lists/*`），或用**多阶段构建**（multi-stage build），只把最终需要的文件 COPY 到一个干净的 base 镜像。
- 考点：层叠加不可缩减、多阶段构建、构建优化。

#### 【期末题/认证题】
**Q6（基础）**：以下关于 Docker 容器可写层的描述，正确的是（多选）：
A. 可写层在容器删除后仍然保留
B. 多个容器共享同一镜像的可写层
C. 可写层默认基于 OverlayFS 的 upperdir 实现
D. 容器内对文件的修改会回写到镜像层
- 答案：**C**。A 错（rm 即删可写层）；B 错（可写层每容器独立，共享的是只读镜像层）；D 错（CoW 写可写层，绝不回写镜像）。
- 考点：可写层独立性、CoW、生命周期。

**Q7（进阶）**：DCA 认证题型——下列哪条命令能获取镜像 `redis:7` 的 manifest 中各层的 sha256 digest？
A. `docker images redis:7`
B. `docker image history redis:7`
C. `docker image inspect redis:7 --format '{{json .RootFS.Layers}}'`
D. `docker ps -a`
- 答案：**C**。`docker image inspect` 返回的 `RootFS.Layers` 字段是各层 diffID（未压缩 sha256）列表；要获取 manifest 中的压缩层 digest 需查 registry 或 `--format '{{json .}}'` 进一步解析。A 只列名字/tag；B 显示构建历史但不一定显示 digest；D 是容器命令。
- 考点：inspect 字段含义、diffID vs digest 区别。

#### 【官网题】
**Q8（基础）** —— 据 Docker 官方文档，`docker pause` 与 `docker stop` 的实现机制有何不同？
- 答案：`docker pause` 使用 **cgroup freezer**（`SIGSTOP` 给所有进程或 cgroup v1 freezer 子系统），冻结容器内全部进程，不发送应用层信号，内存状态完整保留，CPU 不再调度，可 `unpause` 立即恢复。`docker stop` 先向主进程发 `SIGTERM`（默认 10s 超时，可用 `-t` 调整），让应用优雅退出；超时后发 `SIGKILL` 强杀，进程退出，容器进入 exited 状态，需 `start` 重启（应用重新初始化）。
- 考点：pause vs stop 的内核机制；信号语义；来源 docs.docker.com/engine/reference/commandline/pause/。

**Q9（进阶）** —— 据 Docker 官方文档，`overlay2` 驱动要求哪些条件？为何 `vfs` 不推荐用于生产？
- 答案：`overlay2` 要求 Linux 内核 ≥ 3.18（推荐 4.0+），且 backing filesystem 为 `ext4`/`xfs`（xfs 需 `d_type=true`，即 `ftype=1`）。它是 OverlayFS 的 Docker 实现，原生支持 CoW 与分层。`vfs` 驱动不使用联合文件系统，每个层**全量拷贝**到下一层，无 CoW、无层共享，磁盘占用随层数线性爆炸，仅作为不支持 overlay 环境的兜底，绝不可用于生产。
- 考点：存储驱动选型、xfs d_type、vfs 的代价；来源 docs.docker.com/storage/storagedriver/select-storage-driver/。

#### 【实战题】
**Q10（实战）**：你发现 `docker images` 中有大量 `<none>:<none>` 镜像占用数 GB 磁盘，请给出排查与清理的完整方案，并说明如何避免再次产生。
- 答案：
  ```bash
  # 1. 列出悬空镜像（dangling）
  docker images -f dangling=true
  # 2. 安全清理（只删 dangling，不动在用镜像）
  docker image prune -f
  # 3. 进一步清理未使用的镜像（慎用，会删所有未被容器引用的镜像）
  docker image prune -a --filter "until=168h"
  # 4. 查看磁盘整体占用
  docker system df -v
  ```
  成因：① 重新 `docker build` 同名 tag 镜像，旧镜像失去 tag 变 dangling；② 多阶段构建中间层；③ `pull` 了同名新 tag。预防：CI 中固定 digest；构建用 `--label` 标注版本；定期 `docker image prune`；用多阶段构建减小中间层；用 `dive` 工具分析镜像层。
- 考点：dangling 镜像治理、prune 的过滤、构建纪律。

**Q11（实战）**：用一条命令查看容器 `app` 相对其镜像发生的文件改动，并解释 `A`/`C`/`D` 标记的含义；如何把改动后的文件拷到宿主机？
- 答案：
  ```bash
  docker diff app            # 查看可写层改动
  docker cp app:/path/in/container /host/path   # 拷出
  ```
  `A` = Added（可写层新增）；`C` = Changed（CoW 复制并修改）；`D` = Deleted（whiteout 遮挡）。`docker diff` 不显示挂载的 volume 内的改动（那些不在可写层）。
- 考点：可写层观测、CoW 痕迹、docker cp 的边界。

---

### 项目常用场景

**场景1：镜像层共享优化 CI 拉取时间**
- 背景：CI 矩阵跑 20 个 job，每个都 `docker pull` 一个 800MB 的私有镜像，registry 带宽吃紧、单 job 拉取 2 分钟。
- 解决方案：让所有镜像共享同一个稳定 base 层（如 `python:3.12-slim`），业务镜像只在其上叠 2-3 层。配合 registry 缓存与本地 `--pull=missing`（默认）策略，第二个 job 起只下载差异层。进一步用 BuildKit 的 `--cache-from` 跨 job 复用构建缓存。
- 最佳实践：Dockerfile 把**变化频率低的指令放前面**（如 `apt install`、依赖安装），**变化高的放后面**（如 `COPY src/`），最大化层缓存命中；`.dockerignore` 排除 `node_modules`、`.git` 避免无关变动使缓存失效。

**场景2：容器数据持久化与可写层隔离**
- 背景：开发者在容器里跑 MySQL，`docker rm` 后数据库数据全丢。
- 解决方案：所有持久化数据必须用 **named volume** 或 **bind mount**，让数据脱离可写层生命周期。可写层只放临时、可重建的状态。
  ```bash
  docker volume create pgdata
  docker run -d --name pg -v pgdata:/var/lib/postgresql/data postgres:16
  # 即使 docker rm -f pg，pgdata volume 仍保留，重新 run 数据仍在
  docker volume ls
  docker volume rm pgdata          # 显式删 volume 才会丢
  ```
- 最佳实践：生产用 named volume（由 Docker 管理、性能好、可迁移）；开发热重载用 bind mount；`docker rm` 默认不删 volume，需 `docker rm -v` 或 `docker volume prune` 清理；定期 `docker system df -v` 监控 volume 增长。

**场景3：用 digest 锁定生产镜像版本**
- 背景：K8s 部署清单写 `image: app:1.2.3`，某天 registry 上的 `1.2.3` 被重新构建覆盖（修了紧急 bug 但引入回归），所有 pod 重新拉取后行为不一致。
- 解决方案：CI 构建产物**同时打 tag 和 digest**，部署清单用 digest：`image: app@sha256:abc...`。Tag 用于人读，digest 用于机器锁定。配合 Cosign 签名，部署前用 policy 校验签名才允许拉取。
  ```bash
  docker pull myrepo/app:1.2.3
  docker inspect myrepo/app:1.2.3 --format '{{index .RepoDigests 0}}'
  # 输出 myrepo/app@sha256:abc...，把该字符串写入 K8s manifest
  cosign verify --key cosign.pub myrepo/app@sha256:abc...
  ```
- 最佳实践：CI 产出 SBOM + 签名 + digest 三件套；生产清单用 digest + 注释保留 tag 信息（`app@sha256:... # was app:1.2.3`）；用 OPA Gatekeeper / Kyverno 在集群准入阶段强制校验签名。

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|---|---|---|---|
| **镜像（Image）** | **容器（Container）** | 镜像只读、分层、可分发；容器是镜像的运行实例，多一层可写层 + 隔离进程 | 镜像用于构建/分发/存储；容器用于运行应用 |
| **Tag** | **Digest** | Tag 是可变的人类标签（可被覆盖）；Digest 是 manifest 的 sha256，内容寻址不可变 | Tag 用于易读引用；Digest 用于生产锁定/可复现/供应链校验 |
| **Image ID** | **Digest** | Image ID 是 config JSON 的 sha256（本地概念）；Digest 是 manifest 的 sha256（registry 概念）。同一镜像不同 push 的 manifest 可能不同 → digest 不同，但 config 相同 → Image ID 相同 | Image ID 用于本地去重；Digest 用于 registry 寻址与跨环境一致性 |
| **COPY** | **ADD** | COPY 只拷贝本地文件到镜像，行为可预测；ADD 还能自动解压 tar、拉取 URL（行为隐式、不推荐） | 99% 用 COPY；仅在需自动解压本地 tar 时用 ADD |
| **pause** | **stop** | pause 用 cgroup freezer 冻结进程（内存保留、不退出、unpause 立即恢复）；stop 发 SIGTERM 优雅退出（需 start 重启） | pause 用于临时暂停（调试、节省 CPU）；stop 用于正常关闭 |
| **lowerdir** | **upperdir** | lowerdir 是镜像只读层（多层堆叠）；upperdir 是容器可写层（单层），所有写操作落此 | 理解 OverlayFS 时区分二者；备份/迁移时只关心 upperdir 的 diff |
| **diffID** | **digest** | diffID 是层**未压缩** tar 的 sha256（存于 config）；digest 是层**压缩后** blob 的 sha256（存于 manifest） | diffID 用于本地层校验；digest 用于 registry 传输寻址 |

---

### 常见陷阱与坑点

**陷阱1：悬空镜像（dangling image）悄悄吃磁盘**
- 现象：`docker images` 出现大量 `<none>:<none>` 镜像，`docker system df` 显示镜像占用数 GB，但实际在用的镜像远没那么多。
- 原因：重新构建同名 tag 镜像时，旧镜像失去 tag 变为 dangling；多阶段构建的中间镜像、`pull` 覆盖也会产生。dangling 镜像不会被任何容器引用，但 Docker 不会自动删。
- 解决方案：`docker image prune -f` 安全删 dangling；`docker image prune -a` 删所有未被容器引用的镜像（慎用）。
- 预防措施：CI 中构建后立即清理；用 `--label` 给镜像打元数据便于批量管理；定期 `docker system df -v` 审计。

**陷阱2：容器删了，数据没了**
- 现象：`docker rm` 后容器内写入的数据库文件、上传文件、日志全部消失。
- 原因：所有写操作落在**可写层**，`docker rm` 删除可写层即删除数据。可写层不等于持久存储。
- 解决方案：所有需要持久化的路径必须挂载 named volume 或 bind mount，让数据脱离可写层生命周期。
- 预防措施：Dockerfile/部署文档强制规定数据目录挂载；用 `docker inspect <cid> --format '{{.Mounts}}'` 验证挂载；`docker rm` 默认保留 volume，需 `-v` 才删（注意 `-v` 会删匿名 volume，不删 named volume）。

**陷阱3：Tag 被覆盖导致「同一版本」行为不一致**
- 现象：部署清单写 `app:v1.2.3`，今天部署正常，明天同样的清单部署后行为异常。
- 原因：registry 上的 `v1.2.3` tag 被重新构建覆盖了（可能是热修、也可能是误操作），Tag 是可变的、不保证内容稳定。
- 解决方案：生产部署清单**必须用 digest**：`app@sha256:...`；CI 产出后记录 digest 并写入部署清单。
- 预防措施：启用 Docker Content Trust 或 Cosign 强制签名校验；registry 配置 tag 不可变策略（部分 registry 支持 immutable tags）；部署策略层用 Kyverno/Gatekeeper 拒绝纯 tag 引用。

**陷阱4：在 Dockerfile 后续层 `rm` 文件不减镜像体积**
- 现象：`RUN apt-get install -y X` 后接 `RUN rm -rf /var/lib/apt/lists/*`，但镜像大小几乎没减。
- 原因：第一条 `RUN` 已把文件固化在它那一层，第二条 `RUN` 在新层用 whiteout 遮住文件，下层 tar 仍包含原文件，传输与存储按层计。
- 解决方案：在同一 `RUN` 中安装并清理（`&&` 连接）；或用多阶段构建把最终产物 COPY 到干净 base。
- 预防措施：用 `dive` 工具分析每层实际新增内容；多阶段构建是治本方案。

---

### 实践信号

#### 官方进阶文档
- Docker 存储驱动原理与 overlay2：https://docs.docker.com/storage/storagedriver/
- OverlayFS 驱动详解：https://docs.docker.com/storage/drivers/overlayfs/
- Docker Content Trust（镜像签名）：https://docs.docker.com/engine/security/trust/
- OCI 镜像 manifest 规范（registry 协议）：https://docs.docker.com/registry/spec/manifest-v2-2/

#### 社区热议话题
- Sigstore Cosign vs Notary v2 / DCT 取代之争：https://github.com/sigstore/cosign
- Stack Overflow 高频问题「Docker image vs container」：https://stackoverflow.com/questions/23735149
- 镜像层为何不可缩减（whiteout 机制讨论）：https://stackoverflow.com/questions/43498022

#### 动手验证（可执行任务）
1. **观察 CoW 的「首次写复制」**：
   ```bash
   docker run -d --name cow-test alpine sleep 3600
   docker exec cow-test sh -c 'ls -la /usr/bin/busybox; cp /etc/hostname /usr/bin/busybox'
   docker diff cow-test           # 应看到 C /usr/bin/busybox（CoW 触发）
   docker inspect cow-test --format '{{.GraphDriver.Data.UpperDir}}'
   # 在宿主机（Linux 原生）ls 上述 UpperDir，应能看到被复制出来的 busybox 文件
   docker rm -f cow-test
   ```
2. **验证层共享与增量拉取**：
   ```bash
   docker system df -v            # 记录 pull 前 RECLAIMABLE 大小
   docker pull alpine:3.20
   docker pull nginx:1.27-alpine  # 输出中应有 "Already exists" 的层
   docker system df -v            # 对比镜像总大小 vs 共享后实际磁盘，理解 SHARED SIZE 列
   docker image history nginx:1.27-alpine   # 看到每层指令与大小
   ```
3. **用 digest 锁定并验证不可变**：
   ```bash
   docker pull nginx:1.27
   DIGEST=$(docker inspect nginx:1.27 --format '{{index .RepoDigests 0}}')
   echo $DIGEST                    # 形如 nginx@sha256:6af79ae5...
   docker rmi nginx:1.27
   docker pull $DIGEST             # digest 拉取，必定同一内容
   docker images --digests nginx   # 对照 tag 与 digest
   ```

---

## 章节小结

本章建立了 Docker 三大核心概念的完整心智模型：**镜像**是只读、分层、内容寻址的模板；**容器**是镜像的运行实例，靠一层可写层承载所有运行时改动；**分层存储**通过 OverlayFS 的 CoW 机制让镜像层可跨容器共享、可跨镜像复用、可增量分发。务必牢记四组区分：Tag（可变名字）vs Digest（不可变内容寻址）、Image ID（config 哈希）vs Digest（manifest 哈希）、pause（冻结）vs stop（退出）、可写层（临时）vs Volume（持久）。掌握内容寻址与可信分发（DCT/Cosign）是走向生产级供应链安全的门槛。后续章节的构建优化、网络、存储卷都是建立在本章分层与可写层模型之上。
