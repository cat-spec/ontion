## 第1章 技术定位与核心模型

### 核心知识点

> 高度概括，用自己的话解释，不照搬官网。

**1. Docker 是什么 / "在我机器上能跑"问题**
- 概念解释：Docker 是一个基于 Linux 内核特性（Namespace、Cgroup、UnionFS）实现的轻量级应用打包与运行平台。它把应用连同其依赖的库、配置、运行环境一起封装成标准化的"镜像"，再以"容器"的形式分发运行，做到"一次构建，到处运行"。
- 核心作用：消除"在我机器上能跑、到你机器上就崩"的环境差异问题。把环境本身变成可版本化、可分发、可复现的制品，让开发、测试、生产环境完全一致。
- 基本用法：
  ```bash
  # 拉取镜像并运行一个容器
  docker run -d --name web -p 8080:80 nginx:alpine

  # 查看运行中的容器
  docker ps

  # 基于当前代码构建自己的镜像
  docker build -t myapp:1.0 .
  ```
- 注意事项：Docker 解决的是"环境一致性"和"交付标准化"问题，但它不解决"应用本身的 bug"，也不天然解决性能问题；容器不是银弹，有共享内核带来的隔离性弱点。

---

**2. 容器 vs 虚拟机（VM）的本质区别**
- 概念解释：虚拟机（VM）通过 Hypervisor（如 KVM、VMware）虚拟出完整硬件，每个 VM 都跑一个完整的客户机操作系统（Guest OS）。容器则共享宿主机内核，只是在用户态用 Namespace 划出隔离的进程空间，用 Cgroup 限制资源。
- 核心作用：容器省去了 Guest OS 这一层，启动以秒/毫秒计，镜像体积通常几十到几百 MB（VM 常是 GB 级），单机可跑成百上千容器。本质是用"共享内核 + 进程级隔离"换取轻量。
- 基本用法对比：
  ```bash
  # VM：需要先装 Guest OS，启动慢
  # 容器：直接复用宿主内核
  docker run --rm alpine echo "hello"
  ```
- 注意事项：① 容器共享内核，所以内核漏洞或配置不当会波及所有容器，隔离性弱于 VM；② 想运行不同内核版本的 OS（如在 Linux 上跑 Windows 容器）需特殊支持；③ 强隔离场景（多租户、不可信代码）建议用 Kata Containers / gVisor 等沙箱运行时。

---

**3. Docker 的 C/S 架构（客户端 / 守护进程）**
- 概念解释：Docker 采用 C/S 架构。`dockerd`（守护进程，Daemon）负责构建、运行、分发容器，监听 Unix socket 或 TCP；`docker` CLI 是客户端，通过 REST API 与 dockerd 通信。两者可以不在同一台机器。
- 核心作用：解耦"用户操作入口"与"实际执行引擎"，使得远程管理、多节点编排成为可能。
- 基本用法：
  ```bash
  # 查看 daemon 信息
  docker info

  # 让客户端连远程 daemon
  docker -H tcp://192.168.1.10:2375 ps

  # 配置 daemon（/etc/docker/daemon.json）
  {
    "data-root": "/data/docker",
    "registry-mirrors": ["https://mirror.example.com"],
    "log-driver": "json-file",
    "log-opts": { "max-size": "10m", "max-file": "3" }
  }
  ```
- 注意事项：① TCP 暴露 daemon 默认无认证，生产必须配 TLS 或走 SSH 隧道（`ssh://user@host`）；② `data-root` 一旦变更需先停服务并迁移目录；③ daemon 重启不会杀掉正在运行的容器（默认行为）。

---

**4. 镜像、容器、仓库三大核心对象**
- 概念解释：
  - **镜像（Image）**：只读的分层模板，包含应用运行所需的所有文件和元数据，通过 UnionFS 叠加而成。
  - **容器（Container）**：镜像的运行实例，在镜像顶层加一个可写层（容器层），用 Namespace 隔离。
  - **仓库（Registry）**：存储和分发镜像的服务（如 Docker Hub、Harbor），镜像以 `仓库地址/仓库名:标签` 唯一标识。
- 核心作用：把"软件交付物"标准化为镜像制品，让镜像成为构建、分发、运行的统一单位。
- 基本用法：
  ```bash
  docker pull nginx:1.27-alpine       # 从仓库拉镜像
  docker images                        # 查看本地镜像
  docker tag nginx:1.27-alpine myrepo/nginx:dev
  docker push myrepo/nginx:dev         # 推送到仓库
  docker commit web myapp:debug        # 容器层提交成新镜像（不推荐用于正式流程）
  docker save -o app.tar myapp:1.0     # 导出镜像
  docker load -i app.tar               # 导入镜像
  ```
- 注意事项：① 生产镜像别用 `commit` 生成，应通过 `Dockerfile` 可复现构建；② `:latest` 标签会漂移，生产环境必须用具体版本号或 digest；③ 镜像分层共享，删镜像不会立即释放空间，需注意 dangling 镜像清理（`docker image prune`）。

---

**5. Linux Namespaces——容器的隔离基石**
- 概念解释：Namespace 是 Linux 内核提供的一种资源视图隔离机制，让进程以为自己独占某些系统资源。Docker 主要使用 6 种：
  - `pid`：进程号隔离（容器内 PID 从 1 开始）
  - `net`：网络栈隔离（独立网卡、IP、端口、路由表）
  - `mnt`：挂载点视图隔离（独立文件系统树）
  - `uts`：主机名/域名隔离
  - `ipc`：进程间通信隔离（消息队列、共享内存）
  - `user`：用户和用户组 ID 映射隔离（容器内 root 映射为宿主非特权用户）
- 核心作用：让容器看起来像独立系统，但实际只是宿主机上隔离的进程。
- 基本用法：
  ```bash
  # 查看某容器的 namespace
  docker inspect --format '{{.State.Pid}}' web
  ls -l /proc/<pid>/ns/          # 看到各 namespace 链接

  # 进入容器对应的 namespace
  nsenter --target <pid> --mount --net --pid /bin/sh

  # 运行时指定 user namespace 重映射
  docker run --userns=host --rm alpine id
  ```
- 注意事项：① Namespace 是"视图隔离"不是"安全边界"，共享内核意味着内核漏洞可逃逸；② `user` namespace 默认未必开启，需在 daemon.json 配置 `userns-remap`；③ `--pid=host`、`--network=host` 会破坏隔离，仅在调试时用。

---

**6. Cgroups——资源限制基石**
- 概念解释：Cgroups（Control Groups）是 Linux 内核用于限制、记录、隔离进程组资源的机制，主要管 CPU、内存、IO、设备等。Docker 借助 cgroup v1/v2 对容器做配额与限制。
- 核心作用：防止单个容器吃光宿主机资源（OOM、CPU 饥饿），实现多容器间的公平调度。
- 基本用法：
  ```bash
  # 限制 CPU 与内存
  docker run -d --name api \
    --cpus="1.5" \
    --memory="512m" \
    --memory-swap="1g" \
    --pids-limit=200 \
    myapp:1.0

  # 查看容器 cgroup
  docker inspect --format '{{.State.Pid}}' api
  cat /proc/<pid>/cgroup
  ```
- 注意事项：① `--memory` 必须设，否则容器可触发宿主 OOM；② cgroup v2 与 v1 路径和语义不同，新系统多为 v2；③ `--cpus` 是 CPU 配额，`--cpu-shares` 是相对权重，别混淆；④ IO 限制对某些存储驱动效果有限。

---

**7. UnionFS / OverlayFS——分层存储基石**
- 概念解释：UnionFS 是一种把多个目录"联合挂载"成一个目录的文件系统。Docker 用它实现镜像分层：每条 Dockerfile 指令生成一层，多层只读叠加，再在最上面加一个可写容器层。现代默认驱动是 `overlay2`（基于 OverlayFS）。
- 核心作用：① 镜像分层共享，节省存储和拉取带宽；② 构建缓存加速；③ 容器层写时复制（CoW，Copy-on-Write）。
- 基本用法：
  ```bash
  docker info | grep -i storage        # 查看存储驱动
  docker history nginx:alpine          # 查看镜像各层

  # OverlayFS 三层结构：lowerdir（只读镜像层）+ upperdir（容器可写层）+ workdir + merged
  mount | grep overlay
  ```
- 注意事项：① 容器写文件会先把文件从下层复制到上层（CoW），频繁改大文件性能差，日志/数据库数据应放 volume；② `overlay2` 要求内核 ≥ 4.0、推荐 ext4/xfs；③ 删除文件其实是在上层写"whiteout"，不会真正删下层，镜像不会变小。

---

**8. 容器运行时：containerd 与 runc**
- 概念解释：现代 Docker 内部其实是分层架构：`dockerd`（上层）→ `containerd`（守护进程，管镜像和容器生命周期）→ `runc`（底层 OCI 运行时，真正创建/运行容器进程）。containerd 是 CNCF 毕业项目，runc 是 OCI 运行时参考实现。
- 核心作用：职责分层，使运行时可替换（如换为 `kata-runtime`、`crun`、`gVisor` 的 `runsc`），也使 containerd 可被 Kubernetes 直接使用（通过 CRI 接口）。
- 基本用法：
  ```bash
  # 看到容器在底层其实就是 runc
  docker info | grep -i runtime
  docker info | grep -i "runc version"

  # containerd 自带 CLI
  ctr containers ls
  crictl ps        # K8s 场景下查看容器
  ```
- 注意事项：① `ctr` 是 containerd 调试工具，不替代 `docker` CLI；② 切换默认运行时要装 runtime 并在 daemon.json 的 `runtimes` 注册；③ Docker 25.x 内部仍依赖 containerd（默认随 Docker Engine 一起发布）。

---

**9. Docker 与 Kubernetes 的关系定位**
- 概念解释：Docker 是单机层面的"构建+运行"工具；Kubernetes（K8s）是跨多机的"编排+调度"平台。两者不是替代关系：K8s 负责把容器调度到合适节点、保证副本数、滚动升级、服务发现，而容器运行时（如 containerd）才是 K8s 真正直接调用的对象。
- 核心作用：明确分工——Docker 解决"如何打包和运行一个容器"，K8s 解决"如何管理成百上千个容器组成的应用"。
- 基本用法：
  ```bash
  # 单机：docker 足够
  docker compose up -d

  # 多机：用 K8s，K8s 通过 CRI 调用 containerd（而非 docker）
  kubectl run nginx --image=nginx
  kubectl get pods
  ```
- 注意事项：① 自 K8s 1.24 起，dockershim 被移除，K8s 不再直接支持 Docker Engine，而是走 CRI 调用 containerd/CRI-O；② Docker 构建的 OCI 镜像仍能在 K8s 中运行，因为镜像格式是标准的；③ 开发本地仍用 docker/compose，集群用 K8s，这是常见组合。

---

**10. OCI 标准（镜像规范 + 运行时规范）**
- 概念解释：OCI（Open Container Initiative）是 2015 年由 Docker 等发起的开放标准，包含三部分：① **Image Spec**（镜像规范，定义镜像清单、配置、层格式，产物为 `.tar` 的 OCI image）；② **Runtime Spec**（运行时规范，定义如何把镜像解包成"文件系统包 bundle"并启动，runc 是其参考实现）；③ **Distribution Spec**（分发规范，定义 registry API）。
- 核心作用：避免厂商锁定，让镜像和运行时可互换——Podman、containerd、CRI-O 都能跑 Docker 构建的镜像。
- 基本用法：
  ```bash
  # 用 Docker 构建 OCI 标准镜像
  docker build -t myapp:1.0 .
  docker buildx build --output type=oci,dest=myapp.tar .   # 输出 OCI 格式

  # 用 skopeo 检查镜像是否符合规范
  skopeo inspect docker://nginx:alpine
  ```
- 注意事项：① Docker 镜像格式与 OCI 镜像格式历史上略有差异（manifest v2 vs OCI manifest），现在基本兼容；② 符合 OCI 的镜像可跨运行时迁移，但容器运行时行为（如默认 cgroup、seccomp）仍有差异；③ 关注 `org.opencontainers.image.*` 标签规范来标注镜像元信息。

---

### 章节题目（≥10道）

> 来源多样化：面试/论坛/期末/官网/实战。难度分层：基础/进阶/深度/实战

#### 【面试题】

**Q1. 容器和虚拟机最本质的区别是什么？为什么说容器隔离性弱于虚拟机？**（难度：基础）
- 答案：最本质区别在于"是否共享内核"。虚拟机通过 Hypervisor 虚拟出完整硬件，每个 VM 跑独立的 Guest OS 内核，硬件级隔离；容器共享宿主机内核，只是用 Namespace 做进程视图隔离、Cgroup 做资源限制，是进程级隔离。正因共享内核，一旦内核存在漏洞（如 Dirty COW）或容器配置不当（`--privileged`、挂载 `/`），攻击者可能"逃逸"到宿主机，所以隔离性弱于 VM。强隔离需求要用 Kata Containers、gVisor 等沙箱运行时。
- 考点：容器 vs VM、隔离边界、内核共享

**Q2. 请简述 Docker 的整体架构，以及 dockerd / containerd / runc 各自的职责。**（难度：进阶）
- 答案：Docker 是 C/S 架构。`docker` CLI 通过 REST API 调用 `dockerd`（守护进程，负责镜像构建、网络、卷管理等上层逻辑）。`dockerd` 把容器生命周期管理委托给 `containerd`（CNCF 项目，管理镜像拉取、容器创建、快照、容器运行时调用）。`containerd` 再调用符合 OCI 规范的底层运行时 `runc`，由 runc 真正设置 Namespace、Cgroup 并启动容器进程。三者分层的好处是职责清晰、运行时可替换，containerd 也能被 K8s 通过 CRI 直接使用。
- 考点：Docker 架构、运行时分层、containerd/runc

**Q3. Docker 镜像是如何实现分层和共享的？删除一个文件后镜像体积会变小吗？**（难度：深度）
- 答案：镜像由多层只读的文件系统层组成，通过 UnionFS（默认 overlay2）联合挂载。每条 Dockerfile 指令（RUN/COPY/ADD）生成一层，层之间可被多个镜像共享（如多个镜像都基于同一个 `alpine` 层，磁盘只存一份）。容器运行时在最上层加一个可写层，修改文件采用写时复制（CoW）——先把文件从下层复制到可写层再修改。删除文件实际上是在上层写一个 whiteout 标记，下层的那一层并未删除，所以镜像体积不会变小。要真正减小体积，应在同一层里创建并删除文件（如 `RUN apt-get install ... && rm -rf /var/lib/apt/lists/*` 放在同一条 RUN 中），或多阶段构建把需要的产物复制到全新镜像。
- 考点：UnionFS、分层、CoW、镜像瘦身

#### 【论坛题】

**Q4. "Docker 容器里跑的就是个进程，那我为什么还要用 Docker？"**（难度：基础）
- 来源：知乎 / Stack Overflow
- 答案：技术上容器确实是宿主机上的进程（`ps -ef` 能看到），但 Docker 提供的远不止"跑进程"：① 环境一致性——把依赖、配置、库一起打包成镜像，消除"在我机器上能跑"；② 标准化交付——镜像是不可变制品，CI/CD 流水线统一；③ 隔离与资源限制——Namespace + Cgroup 让多服务互不干扰；④ 分发——Registry 让镜像一键拉取部署；⑤ 生态——Compose/K8s 编排、卷/网络抽象。如果只是跑个二进制，进程够了；但凡涉及多环境部署、团队协作、微服务，Docker 价值就显现。
- 考点：Docker 价值定位、容器本质

**Q5. "`docker run --privileged` 到底做了什么？为什么大家都说不安全？**（难度：进阶）
- 来源：Stack Overflow
- 答案：`--privileged` 会：① 关闭大部分安全隔离（seccomp、AppArmor、默认 capability 限制全部移除，赋予所有 capability）；② 把宿主机所有设备（`/dev/*`）挂载进容器；③ 让容器能访问宿主机 PCI、USB 设备；④ 不再启用 user namespace。这等于"容器几乎等于宿主机 root"，一旦容器被攻破即可逃逸。仅在需要挂载外部设备、运行 Docker-in-Docker、调试内核模块时才用，且应限定在受控环境。更安全的做法是用 `--cap-add` 精确授予所需 capability（如 `SYS_ADMIN`），配合 `--device` 只挂载特定设备。
- 考点：特权容器、安全、capability

**Q6. "K8s 1.24 弃用了 Docker，那我以前用 Docker 构建的镜像还能在 K8s 跑吗？"**（难度：进阶）
- 来源：Stack Overflow / GitHub Discussions
- 答案：能。K8s 弃用的是 `dockershim`（Kubelet 调用 Docker Engine 的适配层），不是 Docker 公司或 Docker 镜像。K8s 节点改用符合 CRI 标准的运行时（containerd、CRI-O）。由于 Docker 构建的镜像符合 OCI 镜像规范，containerd 完全能拉取和运行。所以：① 镜像照常用 `docker build` 构建；② 集群节点把运行时换成 containerd 即可；③ CI/CD 流程基本不变。真正受影响的是那些直接通过 Docker API（而不是 K8s API）操作节点的工具，需改用 `crictl`。
- 考点：dockershim、CRI、OCI 镜像兼容性

#### 【期末题/认证题】

**Q7. （Linux 基金会 / CKA 认证风格）下列关于 Linux Namespace 的说法，正确的是？**（难度：进阶）
A. Namespace 提供硬件级隔离，与虚拟机等价
B. `pid` namespace 让容器内进程对宿主机不可见，宿主机也看不到容器进程
C. `user` namespace 默认在所有 Docker 安装中启用
D. `--network=host` 会让容器与宿主机共享网络栈

- 答案：D。A 错，Namespace 是进程级视图隔离，非硬件级；B 错，宿主机能看到容器进程（在宿主 `ps` 里能看到，只是 PID 不同）；C 错，user namespace 默认未启用，需 `userns-remap` 配置；D 正确，`--network=host` 让容器复用宿主机 net namespace。
- 考点：Namespace 各类型语义

**Q8. （DCA 认证风格）关于 cgroup v2 与资源限制，下列哪项描述正确？**（难度：深度）
A. `--cpu-shares` 是硬性 CPU 上限
B. `--memory` 不设时，容器内存无上限，可能触发宿主 OOM Killer
C. cgroup v2 与 v1 的层级结构完全相同
D. `--cpus=2` 表示容器一定独占 2 个 CPU 核心

- 答案：B。A 错，`--cpu-shares` 是相对权重，不是上限；B 正确，不设内存限制时容器可用完宿主内存，触发 OOM；C 错，v2 是统一层级，v1 是按控制器分多个层级；D 错，`--cpus` 是配额（CPU quota），是时间片限制，不独占物理核心。
- 考点：cgroup、CPU/内存限制语义

#### 【官网题】

**Q9. （Docker 官方文档 - Docker overview）Docker Engine 主要由哪几个组件构成？**（难度：基础）
- 答案：根据官方文档，Docker Engine 是 C/S 应用，包含三部分：① **Docker Daemon（dockerd）**：守护进程，监听 Docker API 请求，管理镜像、容器、网络、卷；② **REST API**：客户端与 daemon 通信的接口；③ **Docker CLI（docker）**：用户与之交互的命令行客户端。daemon 之下还集成了 containerd 和 runc 负责实际容器运行时功能。
- 考点：Docker Engine 架构
- 来源：https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/

**Q10. （Docker 官方文档 - Storage）为什么推荐使用 Docker managed volume 而不是容器可写层来存储数据库数据？**（难度：进阶）
- 答案：容器可写层使用 UnionFS 的写时复制（CoW）机制：① 性能差——每次修改大文件都要从下层复制到上层，且多了一层间接；② 生命周期短——容器删除后可写层随之消失，数据丢失；③ 不便共享与备份。Volume 由 Docker 独立管理，存储在宿主机特定目录（默认 `/var/lib/docker/volumes`），绕过 UnionFS 直接读写宿主文件系统，性能接近原生，且独立于容器生命周期，可挂载到多个容器、方便备份迁移。所以数据库、日志、上传文件等持久化数据必须用 volume 或 bind mount。
- 考点：存储驱动、volume、CoW
- 来源：https://docs.docker.com/engine/storage/

#### 【实战题】

**Q11. 你接手一个老项目，开发说"在我电脑上能跑"，但部署到生产服务器就启动失败。如何用 Docker 化方案彻底解决这个问题？请给出关键步骤。**（难度：实战）
- 答案：① 用 Dockerfile 把应用运行环境固化：基于固定版本基础镜像（如 `python:3.11-slim`），`COPY` 代码、`pip install` 锁定版本（`requirements.txt` 或 `poetry.lock`），声明 `CMD`；② 用多阶段构建保证镜像精简且可复现；③ 用 `docker compose` 定义应用+依赖（DB、Redis）及其版本，配置环境变量与挂载卷；④ CI 流水线构建镜像并推送 Registry，生产从 Registry 拉取同一 digest 的镜像运行；⑤ 配置只通过环境变量/配置文件挂载注入，不 baked 进镜像。这样开发、测试、生产跑的是同一个不可变镜像，环境差异被消除。
- 考点：Dockerfile、Compose、不可变交付

**Q12. 线上一个 Java 服务容器经常被 OOM Kill，但 JVM 配置的 `-Xmx` 远小于容器内存限制，为什么？如何修复？**（难度：实战）
- 答案：根因是老版本 JVM（< 8u191 / 10 之前）默认按"宿主机总内存"而非"容器内存限制"计算堆大小，导致 JVM 以为自己有大内存、实际被 cgroup 限制后触发 OOM Kill。修复：① 升级 JDK 到 8u191+ 或 11+，它们支持 `+UseContainerSupport`（默认开启），会按 cgroup 限制计算；② 显式设置 `-XX:MaxRAMPercentage=75.0` 而不是写死 `-Xmx`，让 JVM 自适应容器；③ 同时确保 `docker run` 设了 `--memory`；④ 别忘了容器内非堆内存（Metaspace、线程栈、Direct Memory）也占内存，给 JVM 留出 25% 余量。可用 `docker stats` 观察容器内存使用验证。
- 考点：JVM 容器感知、cgroup 内存限制、OOM

---

### 项目常用场景

**场景1：开发环境标准化（消除"在我机器上能跑"）**
- 背景：团队多人开发、本地系统各异（macOS/Windows/Linux），依赖版本不一致导致联调困难。
- 解决方案：
  ```bash
  # docker-compose.yml 定义完整开发环境
  cat > docker-compose.yml <<'EOF'
  services:
    web:
      build: .
      ports: ["8080:8080"]
      volumes: ["./src:/app/src"]
      environment:
        DB_HOST: db
    db:
      image: postgres:16-alpine
      environment:
        POSTGRES_PASSWORD: dev
      volumes: ["pgdata:/var/lib/postgresql/data"]
  volumes:
    pgdata:
  EOF
  docker compose up -d
  ```
- 最佳实践：① 基础镜像固定版本（如 `postgres:16-alpine` 而非 `latest`）；② 源码用 bind mount 实现热重载，数据用 named volume 持久化；③ 把 `.env` 文件用于环境差异，不进版本库；④ 一条 `docker compose up` 让新成员 5 分钟跑起项目。

**场景2：CI/CD 中的镜像构建与交付**
- 背景：需要在 GitLab CI / GitHub Actions 中构建镜像、扫描、推送、部署，保证交付物可复现。
- 解决方案：
  ```yaml
  # GitHub Actions 片段
  - uses: docker/setup-buildx-action@v3
  - uses: docker/login-action@v3
    with:
      registry: ghcr.io
      username: ${{ github.actor }}
      password: ${{ secrets.GITHUB_TOKEN }}
  - uses: docker/build-push-action@v5
    with:
      context: .
      push: true
      tags: |
        ghcr.io/org/app:${{ github.sha }}
        ghcr.io/org/app:1.0.${{ github.run_number }}
      cache-from: type=gha
      cache-to: type=gha,mode=max
  ```
- 最佳实践：① 标签用 Git SHA + 语义版本，不用 `latest`；② 启用 BuildKit 缓存（`type=gha` 或 registry cache）加速；③ 构建后跑 `trivy image` 漏洞扫描；④ 生产部署用 digest 锁定（`app@sha256:abc...`）防止标签漂移。

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|---------|---------|
| 容器 | 虚拟机（VM） | 容器共享宿主内核、进程级隔离、秒级启动、MB 级；VM 有独立 Guest OS、硬件级隔离、分钟级启动、GB 级 | 容器：微服务、CI、快速伸缩；VM：强隔离、运行异构 OS、不可信负载 |
| Docker | Kubernetes | Docker 是单机构建+运行容器；K8s 是跨多机编排+调度平台，通过 CRI 调用 containerd | Docker：本地开发、单机部署、Compose；K8s：生产集群、大规模微服务 |
| 镜像（Image） | 容器（Container） | 镜像是只读分层模板（制品）；容器是镜像的运行实例，加一个可写层 | 镜像：构建、分发、版本管理；容器：实际运行应用 |
| containerd | runc | containerd 是高层守护进程（管镜像、生命周期、快照）；runc 是底层 OCI 运行时（真正设置 ns/cgroup 启动进程） | containerd：作为 K8s/Docker 的运行时核心；runc：被 containerd 调用，可替换为 kata/gVisor |
| Namespace | Cgroup | Namespace 管"能看到什么"（视图隔离）；Cgroup 管"能用多少"（资源限制） | Namespace：隔离 PID/网络/挂载点；Cgroup：限制 CPU/内存/IO |
| `--cpus` | `--cpu-shares` | `--cpus` 是 CPU 配额（绝对上限，如 1.5 核）；`--cpu-shares` 是相对权重（仅竞争时生效） | `--cpus`：硬性限制；`--cpu-shares`：弹性按权重分配 |
| OCI 镜像 | Docker 镜像 | 历史上格式略有差异，现已基本兼容；OCI 是开放标准，Docker 镜像也遵循 OCI | 都能被 containerd/Podman/CRI-O 运行，可互换 |

---

### 常见陷阱与坑点

**陷阱1：用 `:latest` 标签部署生产，导致"同一个镜像名行为漂移"**
- 现象：昨天部署正常，今天重新 `docker pull app:latest && docker run` 后行为变了，甚至启动失败。
- 原因：`:latest` 是可变标签，仓库里的 latest 会被新构建覆盖。本地可能还用着缓存的老镜像，不同节点拉到的 latest 可能不一致。
- 解决方案：① 生产用不可变版本号或 digest：`app:1.2.3` 或 `app@sha256:abc...`；② `docker-compose.yml` 里所有镜像写死版本；③ 部署前用 `docker image inspect` 确认 digest。
- 预防措施：CI 流水线构建时输出 digest 并写入部署清单，禁止生产用 `:latest`。

**陷阱2：以为 `docker commit` 是构建镜像的正确方式**
- 现象：开发者在容器里手动装了一堆包、改了配置，然后 `docker commit` 生成镜像交付，结果下次重 build 完全不一致，且镜像巨大。
- 原因：`commit` 只是把容器可写层固化为新层，不记录任何"如何构建"的信息，不可复现、不可审计、包含大量临时文件。
- 解决方案：始终用 `Dockerfile` 构建镜像，把所有变更写成可复现指令；用多阶段构建分离构建环境与运行环境。
- 预防措施：团队约定禁止 `commit` 进生产流程，CI 只接受带 Dockerfile 的 PR。

**陷阱3：在 Dockerfile 的不同 RUN 里删除文件，以为镜像变小了**
- 现象：写了 `RUN apt-get install -y xxx`，下一行 `RUN rm -rf /var/lib/apt/lists/*`，结果镜像体积没变小。
- 原因：每条 `RUN` 是一层，第一层装了包，第二层只是写了 whiteout 标记"删除"，但第一层的包文件还在镜像里，两层叠加后体积不变。
- 解决方案：把安装与清理放在同一条 `RUN` 中，用 `&&` 串联，确保在同一层内删除：
  ```dockerfile
  RUN apt-get update \
      && apt-get install -y --no-install-recommends curl \
      && rm -rf /var/lib/apt/lists/*
  ```
- 预防措施：用 `dive` 工具分析每层体积，用多阶段构建只复制最终产物到精简镜像。

**陷阱4：容器内进程以 root 运行，逃逸即等于宿主 root**
- 现象：很多基础镜像默认 USER 是 root，应用也以 root 跑，一旦容器被攻破，攻击者拿到容器 root，配合漏洞可直接逃逸成宿主 root。
- 原因：默认未启用 user namespace 重映射，容器内 root UID=0 在宿主也是 UID=0。
- 解决方案：① Dockerfile 里 `RUN adduser` 后用 `USER appuser` 切换非 root；② daemon.json 启用 `"userns-remap": "default"`，让容器 root 映射为宿主高 UID 普通用户；③ 配合 `--read-only`、`--cap-drop=ALL` 收紧权限。
- 预防措施：所有生产镜像默认非 root 运行，安全基线检查中强制要求。

---

### 实践信号

#### 官方进阶文档
- **Docker overview（核心概念全景）**：https://docs.docker.com/get-started/docker-concepts/ - 学习重点：理解 Engine/镜像/容器/Registry 的整体关系，作为本章知识体系的官方对照。
- **Storage drivers（存储驱动原理）**：https://docs.docker.com/engine/storage/drivers/ - 学习重点：深入理解 overlay2、CoW、镜像分层如何落地，是理解"镜像为何分层"的关键。
- **Open Container Initiative（OCI 标准）**：https://opencontainers.org/ - 学习重点：理解 Image Spec / Runtime Spec / Distribution Spec 三大规范，明白为何镜像能跨运行时。

#### 社区热议话题
- **话题："K8s 弃用 Docker 之后，Docker 还值得学吗？"**：来源于 知乎 / Reddit r/docker
  - 讨论要点：dockershim 移除只影响 K8s 节点运行时，不影响镜像构建；Docker 仍是本地开发与 CI 构建的事实标准。
  - 高赞答案摘要：Docker 作为"构建+本地运行"工具仍不可替代，但生产集群运行时应转向 containerd；开发掌握 docker/compose，运维再学 containerd/CRictl 即可。
- **话题："生产环境到底要不要开 user namespace 重映射？"**：来源于 Docker GitHub Issues / Stack Overflow
  - 讨论要点：开启 `userns-remap` 后容器内 root 映射为宿主非特权用户，提升安全性，但带来权限/挂载兼容性问题。
  - 高赞答案摘要：多租户或运行不可信镜像时强烈建议开启；但需测试现有镜像在 userns 下的文件权限兼容性，逐步迁移。

#### 动手验证
请完成以下实践任务：

1. **观察容器的本质——它就是宿主机上的进程**
   - 要求：运行一个 `nginx` 容器，在宿主机用 `ps -ef | grep nginx` 找到它，记录其宿主机 PID；然后用 `docker inspect --format '{{.State.Pid}}' <容器名>` 对照，确认两者是同一进程；最后 `ls -l /proc/<宿主PID>/ns/` 查看它所处的 6 个 namespace。
   - 预期输出：能看到容器进程在宿主 `ps` 中真实存在，`inspect` 输出的 PID 与 `ps` 一致，`/proc/<pid>/ns/` 下有 pid/net/mnt/uts/ipc/user 等符号链接，且与宿主 init 进程的 namespace 链接 inode 不同。
   - 提示：macOS 用户需在 Docker Desktop 提供的 Linux VM 内执行 `ps`（可 `docker run --rm --privileged --pid=host alpine ps -ef | grep nginx` 间接观察）。

2. **验证镜像分层与 CoW 行为**
   - 要求：① 用 `docker history nginx:alpine` 观察镜像各层及其指令、大小；② 运行容器后在容器内修改 `/usr/share/nginx/html/index.html`，回到宿主用 `docker diff <容器名>` 查看哪些文件被改（C/A/D 标记）；③ 删除容器后再 `docker run` 同一镜像，确认改动消失，理解可写层生命周期。
   - 预期输出：`history` 显示多条分层记录；`docker diff` 列出被修改文件（如 `C /usr/share/nginx/html/index.html`）；重新运行后文件恢复原状。
   - 提示：`docker diff` 只看容器可写层相对镜像层的差异，这正是 CoW 留下的痕迹。

3. **对比 cgroup 资源限制效果**
   - 要求：分别运行两个容器：A `docker run -d --name limited --cpus="0.5" --memory="128m" progrium/stress --cpu 1 --vm 1 --vm-bytes 100M`，B 不加限制。用 `docker stats` 观察两者 CPU% 和 MEM USAGE / LIMIT，验证 A 被 cgroup 限制在约 50% CPU 和 128MB 内存。
   - 预期输出：`docker stats` 中 limited 容器 CPU% ≈ 50%、MEM LIMIT 为 128MiB，超出会被 OOM Killed；无限制容器可吃满空闲 CPU 与内存。
   - 提示：stress 镜像可换为 `polinux/stress`；观察 OOM 用 `docker inspect limited --format '{{.State.OOMKilled}}'`。

---

## 章节小结

本章从"在我机器上能跑"这一经典工程难题切入，厘清了 Docker 的技术定位——基于 Linux Namespace（隔离）、Cgroup（限流）、UnionFS（分层）三大内核特性构建的轻量级应用打包与运行平台，区别于共享内核带来的弱隔离性虚拟机；并梳理了 Docker 的 C/S 架构、镜像/容器/仓库三大对象、containerd/runc 分层运行时与 OCI 开放标准，以及它与 Kubernetes"单机运行 vs 多机编排"的互补关系，为后续章节的镜像构建、容器运行与生产实践打下概念地基。
