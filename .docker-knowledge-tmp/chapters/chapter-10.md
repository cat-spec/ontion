## 第10章 安全、性能优化与生产实践

### 核心知识点

> 容器并不天然安全，它依赖 Linux 内核机制（namespace、cgroups、capabilities、LSM）层层叠加隔离；同时镜像与运行时性能、磁盘治理、监控能力共同决定一个容器能否进入生产。本章聚焦"把容器从开发机能跑到生产环境"所需的全部加固与优化手段。

**1. 容器安全的内核基石（Namespace / Cgroups / Capabilities / LSM）**
- 概念解释：Docker 容器的"隔离感"本质是 Linux 内核提供的三类机制叠加：① **namespace** 让容器看到独立的 PID/NET/MNT/IPC/UTS/USER（cgroup namespace 在 4.6 加入），决定"看到什么"；② **cgroups** 限制 CPU、内存、IO、PID 数量，决定"用多少"；③ **Linux capabilities** 把 root 权限拆成约 40 项细粒度能力（如 CAP_SYS_ADMIN、CAP_NET_BIND_SERVICE），决定"能做什么"；④ **LSM**（AppArmor/SELinux）做强制访问控制（MAC），决定"能不能访问这个文件"。
- 核心作用：构成容器与宿主机之间、容器与容器之间的多重防御纵深。哪怕某一层被绕过，下一层仍能限制爆炸半径。
- 基本用法：
  ```bash
  # 查看容器内的 namespace
  docker run --rm --privileged --pid=host alpine nsenter -t 1 -m -u -i -n -p sh
  # 查看当前进程的 capabilities
  docker run --rm alpine cat /proc/1/status | grep Cap
  # 查看当前 cgroup
  docker run --rm alpine cat /proc/1/cgroup
  ```
- 注意事项：namespace 并非"虚拟机"，内核仍是共享的，内核漏洞（如 Dirty COW）可穿透；USER namespace 默认未启用，容器内 root 在宿主上仍是 root（uid=0），需 `--userns-remap=default` 启用映射。

**2. Seccomp / AppArmor / SELinux 三件套**
- 概念解释：① **Seccomp**（secure computing mode）过滤容器可调用的系统调用，Docker 默认使用白名单 profile（`/etc/docker/seccomp-default.json`）屏蔽 `keyctl`、`mount`、`reboot` 等约 44 个高危 syscall；② **AppArmor** 是基于路径的 MAC，Ubuntu/Debian 默认加载 `docker-default` profile；③ **SELinux** 是基于标签（type enforcement）的 MAC，RHEL/CentOS 默认启用，对容器进程打 `svirt_lxc_net_t` 标签。
- 核心作用：在 syscall 与文件访问两个层面"封死"漏洞利用路径。例如即便容器内进程拿到 RCE，seccomp 也让 `keyctl` 这类提权 syscall 直接返回 EPERM。
- 基本用法：
  ```bash
  # 默认 seccomp 已启用，验证：
  docker run --rm alpine grep Seccomp /proc/1/status   # Seccomp: 2
  # 自定义 profile（只允许 read/write/exit 等）
  docker run --security-opt seccomp=/path/to/profile.json alpine
  # 临时禁用（仅调试，生产禁用）
  docker run --security-opt seccomp=unconfined alpine
  # AppArmor 指定 profile
  docker run --security-opt apparmor=docker-default alpine
  ```
- 注意事项：`--privileged` 会同时关闭 seccomp/AppArmor/SELinux 并授予所有 capabilities，等于把上面三层防御全部卸下，生产环境绝不应使用。

**3. 镜像安全：最小基础镜像与非 root 用户**
- 概念解释：基础镜像越小，攻击面越窄。常见选项：① `scratch`（空镜像，0 字节，只适合静态编译 Go/Rust）；② `distroless`（Google 出品，仅有运行时和最小 libc，无 shell、无包管理器）；③ `alpine`（5MB，但用 musl libc，可能引发 DNS/CGO 兼容问题）；④ `debian-slim`/`ubuntu` 镜像的 slim 变体。
- 核心作用：去除 shell、包管理器、`curl` 等工具后，攻击者即便拿到 RCE 也无法横向移动；USER 非 root 后，提权路径被切断。
- 基本用法（加固后的生产 Dockerfile 范式）：
  ```dockerfile
  # syntax=docker/dockerfile:1.7
  ---------- 构建阶段 ----------
  FROM golang:1.22-alpine AS builder
  WORKDIR /src
  COPY go.mod go.sum ./
  RUN --mount=type=cache,target=/go/pkg/mod go mod download
  COPY . .
  RUN --mount=type=cache,target=/root/.cache/go-build \
      CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/app ./cmd/app

  ---------- 运行阶段 ----------
  FROM gcr.io/distroless/static-debian12:nonroot
  COPY --from=builder /out/app /app
  USER nonroot:nonroot
  EXPOSE 8080
  ENTRYPOINT ["/app"]
  ```
- 注意事项：distroless 没有 shell，无法 `docker exec -it ... sh` 排错，可用 `:debug` 变体或额外复制 `busybox`；USER 必须配合文件权限（COPY 默认 root:root，非 root 进程可能读不到）。

**4. 运行时加固四件套：--read-only / --cap-drop ALL / no-new-privileges / 资源限制**
- 概念解释：① `--read-only` 把根文件系统挂载为只读，防止 webshell 落盘；② `--cap-drop ALL` 移除所有 Linux capabilities，再按需 `--cap-add`（如 `NET_BIND_SERVICE`）；③ `--security-opt no-new-privileges` 阻止 setuid 提权；④ `-m/--memory`、`--cpus`、`--pids-limit` 防止资源耗尽（OOM/ fork bomb）。
- 核心作用：即便应用被攻破，攻击者也无法写文件、无法调用 setuid、无法占满宿主资源拖垮邻居容器（"吵闹的邻居"问题）。
- 基本用法：
  ```bash
  docker run -d \
    --read-only \
    --cap-drop ALL --cap-add NET_BIND_SERVICE \
    --security-opt no-new-privileges \
    --memory=512m --memory-swap=512m \
    --cpus=1 --pids-limit=100 \
    --tmpfs /tmp:rw,size=64m \
    --health-cmd="wget -qO- http://localhost:8080/healthz || exit 1" \
    --health-interval=30s --health-retries=3 \
    myapp:1.2.3
  ```
- 注意事项：`--read-only` 下应用要写临时文件必须挂 `--tmpfs` 或 named volume；`--cap-drop ALL` 后若用 ping 需补 `NET_RAW`；swap 设为与 memory 相等即禁用 swap。

**5. 镜像漏洞扫描：Docker Scout / Trivy / Snyk**
- 概念解释：扫描镜像 OS 包（apt/apk）与语言依赖（npm/pip/maven）的 CVE。① **Docker Scout**（前身为 `docker scan`，2024 起独立品牌）是官方集成方案，默认对接 Snyk 数据库，`docker scout cves image` 直接出报告；② **Trivy**（Aqua 出品，CNCF）开源免费，`trivy image` 一行出报告，CI 友好；③ **Snyk** 商业产品，IDE 插件生态强。
- 核心作用：在镜像 push 前拦截已知 CVE，把"带病上线"挡在 CI 阶段；与 SBOM 结合可做供应链溯源。
- 基本用法：
  ```bash
  # Docker Scout（Docker Desktop 内置，CLI 也可独立安装）
  docker scout cves myapp:1.2.3
  docker scout cves --only-severity high,critical myapp:1.2.3
  docker scout sbom myapp:1.2.3              # 生成 SBOM
  docker scout enable                        # 在仓库启用 Scout

  # Trivy
  trivy image --severity HIGH,CRITICAL --exit-code 1 myapp:1.2.3
  trivy image --ignore-unfixed myapp:1.2.3   # 只显示已修复的 CVE

  # GitLab CI 示例
  trivy image --exit-code 1 --severity CRITICAL $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  ```
- 注意事项：扫描结果依赖 DB 时效性，需 `trivy image --download-db-only` 定期更新；扫描 distroless 镜像会得到极少 CVE，是验证最小化效果的最直接证据。

**6. 镜像体积优化：多阶段 / 合并 RUN / .dockerignore / slim**
- 概念解释：体积优化的四把刀：① **多阶段构建**：用 `AS builder` 编译，再 `COPY --from=builder` 只取产物，编译器/源码不进最终镜像；② **合并 RUN**：每条 RUN 产生一层，`RUN apk add --no-cache curl && rm -rf /var/cache/apk/*` 把安装与清理放一层，避免中间层残留；③ **.dockerignore**：构建上下文越小，`docker build` 越快，镜像越小（`node_modules`、`.git`、`*.log` 一律排除）；④ **基础镜像选 slim/distroless**。
- 核心作用：减小镜像 = 减小攻击面 + 加快 pull/push + 省存储成本。一个 1.2GB 的 Node 镜像优化后可压到 120MB。
- 基本用法：
  ```dockerignore
  # .dockerignore
  .git
  node_modules
  npm-debug.log
  Dockerfile*
  .env*
  coverage
  .vscode
  ```
  ```dockerfile
  # 合并 RUN + 多阶段 + 清理缓存
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build && npm prune --production

  FROM node:20-alpine AS runner
  WORKDIR /app
  RUN addgroup -S app && adduser -S app -G app
  COPY --from=builder --chown=app:app /app/node_modules ./node_modules
  COPY --from=builder --chown=app:app /app/dist ./dist
  USER app
  CMD ["node", "dist/main.js"]
  ```
- 注意事项：`apk add` 务必加 `--no-cache`，否则会在 `/var/cache/apk` 留下包缓存；`COPY --chown` 一次完成属主设置，省一层 `RUN chown`。

**7. 构建性能优化：BuildKit 缓存挂载 / 远程缓存 / 并行多阶段**
- 概念解释：① **缓存挂载 `--mount=type=cache`**：把包管理器缓存（`/go/pkg/mod`、`/root/.cache/go-build`、`~/.m2`、`~/.npm`）挂为持久化缓存卷，不进镜像但跨构建复用，速度提升 5–10 倍；② **远程缓存**：`--cache-from`/`--cache-to` 把缓存推到 registry（`type=registry`）或本地（`type=local`），跨机器共享；③ **并行多阶段**：BuildKit 自动并行执行无依赖的 `FROM ... AS` 阶段。
- 核心作用：把"重新拉依赖"这个最慢的环节降到一次。
- 基本用法：
  ```dockerfile
  # syntax=docker/dockerfile:1.7
  FROM golang:1.22 AS deps
  WORKDIR /src
  COPY go.mod go.sum ./
  RUN --mount=type=cache,target=/go/pkg/mod \
      go mod download

  FROM node:20 AS frontend
  WORKDIR /web
  COPY web/package*.json ./
  RUN --mount=type=cache,target=/root/.npm \
      npm ci
  COPY web/ .
  RUN npm run build

  FROM golang:1.22 AS backend
  WORKDIR /src
  COPY --from=deps /src /src
  COPY . .
  RUN --mount=type=cache,target=/go/pkg/mod \
      --mount=type=cache,target=/root/.cache/go-build \
      go build -o /out/app ./cmd/app

  FROM gcr.io/distroless/static-debian12
  COPY --from=backend /out/app /app
  COPY --from=frontend /web/dist /web
  USER nonroot
  ENTRYPOINT ["/app"]
  ```
  ```bash
  # 远程缓存
  docker build \
    --cache-from type=registry,ref=registry.example.com/myapp:buildcache \
    --cache-to   type=registry,ref=registry.example.com/myapp:buildcache,mode=max \
    -t myapp:1.2.3 .
  # 强制启用 BuildKit
  DOCKER_BUILDKIT=1 docker build ...
  ```
- 注意事项：缓存挂载在多架构构建（buildx）下每架构独立缓存；`mode=max` 才会缓存中间层（默认 `min` 只缓存最终层）；缓存共享有"投毒"风险，多人 CI 共享缓存需配合 `sharing=locked`。

**8. 运行性能：overlay2 / 日志限制 / healthcheck**
- 概念解释：① **overlay2** 是 Docker 推荐的存储驱动（写时复制），比 aufs/devicemapper 快 30%+，要求内核 ≥ 4.0 且文件系统为 ext4/xfs；② **日志大小限制**：容器 stdout 默认走 `json-file` 驱动，不限制大小会撑爆磁盘，必须配 `max-size`/`max-file`；③ **healthcheck** 让 Docker 主动探活， unhealthy 容器可被 Swarm/K8s 重启。
- 核心作用：overlay2 减少 IO 放大；日志限制防止"日志撑爆磁盘"这个最常见的生产事故；healthcheck 让编排系统快速感知故障。
- 基本用法：
  ```json
  // /etc/docker/daemon.json
  {
    "storage-driver": "overlay2",
    "log-driver": "json-file",
    "log-opts": { "max-size": "10m", "max-file": "3" },
    "live-restore": true,
    "userland-proxy": false
  }
  ```
  ```dockerfile
  HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/healthz || exit 1
  ```
- 注意事项：healthcheck 不要用 `ping`，应用假死时 TCP 仍通；`max-size` 设过小会导致日志丢失，过大失去意义，常用 10m×3。

**9. 生产部署实践：12-factor / 单容器单进程 / 优雅停止 / 信号处理**
- 概念解释：① **12-factor** 强调配置走环境变量、日志走 stdout、无状态进程；② **单容器单进程**：一个容器跑一个进程，进程崩溃即容器退出由编排系统重启，比容器内跑 supervisor 更可观测；③ **优雅停止**：`docker stop` 先发 `SIGTERM`，等待 `--stop-timeout`（默认 10s）后再 `SIGKILL`，应用必须捕获 TERM 做清理；④ **PID 1 问题**：容器内进程是 PID 1，需正确转发信号给子进程，否则 `docker stop` 卡 10s 才强杀。
- 核心作用：让容器成为编排系统可管理的"原子单元"，故障可被快速感知与重启。
- 基本用法：
  ```dockerfile
  # 使用 exec 形式让进程成为 PID 1（不要用 shell 形式 ENTRYPOINT ["sh","-c","app"]）
  ENTRYPOINT ["./app"]
  ```
  ```go
  // Go 优雅停止示例
  srv := &http.Server{Addr: ":8080", Handler: mux}
  go srv.ListenAndServe()
  quit := make(chan os.Signal, 1)
  signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
  <-quit
  ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
  defer cancel()
  srv.Shutdown(ctx)   // 处理完在途请求再退出
  ```
- 注意事项：shell 形式 `ENTRYPOINT app` 会让 `sh` 成为 PID 1，不转发 SIGTERM；Java 应用注意 `exec java` 替代 `java` 让它成为 PID 1；`stop-grace-period` 在 Compose 中对应 `--stop-timeout`。

**10. Docker daemon 配置：daemon.json / live-restore / registry mirror**
- 概念解释：`/etc/docker/daemon.json` 是 daemon 全局配置文件，重启 daemon 生效（`live-restore: true` 时可不重启）。关键项：`storage-driver`、`log-opts`、`registry-mirrors`（国内拉镜像加速）、`insecure-registries`、`live-restore`（重启 daemon 不杀容器，运维友好）、`userns-remap`（启用用户命名空间映射）、`default-runtime`/`runtimes`（指定 Kata/gVisor 等沙箱运行时）、`no-new-privileges`。
- 核心作用：一处配置全局生效，统一安全基线与性能参数。
- 基本用法：
  ```json
  {
    "storage-driver": "overlay2",
    "log-driver": "json-file",
    "log-opts": { "max-size": "10m", "max-file": "5" },
    "live-restore": true,
    "userland-proxy": false,
    "max-concurrent-downloads": 10,
    "registry-mirrors": ["https://registry.docker-cn.com"],
    "insecure-registries": ["10.0.0.5:5000"],
    "userns-remap": "default",
    "default-runtime": "runc",
    "runtimes": {
      "kata-runtime": { "path": "/usr/bin/kata-runtime" }
    },
    "icc": false,
    "no-new-privileges": true,
    "metrics-addr": "0.0.0.0:9323",
    "experimental": true
  }
  ```
  ```bash
  sudo systemctl restart docker   # live-restore=true 时容器不中断
  ```
- 注意事项：`userns-remap` 启用后已存在容器的文件属主会错乱，需迁移；`icc: false` 关闭容器间默认通信，需 `--link` 或自定义网络才能通信。

**11. 监控与日志：docker stats / Prometheus + cAdvisor / Loki / ELK**
- 概念解释：① **docker stats** 实时查看 CPU/内存/网络/IO，适合排查；② **cAdvisor** Google 出品，导出容器 metrics，Prometheus 抓取，Grafana 展示，是 K8s 之前的标准方案；③ **Docker daemon metrics** `metrics-addr: 0.0.0.0:9323` 暴露 `/metrics`；④ **日志收集**：`fluentd`/`fluent-bit`/`Loki`/`Filebeat` 用 `log-driver: fluentd` 直接打到日志系统，或用 `promtail` 采集 `json-file` 日志送 Loki。
- 核心作用：让"黑盒容器"变成可观测系统，metrics + logs + traces 三支柱。
- 基本用法：
  ```bash
  docker stats                # 实时
  docker stats --no-stream    # 单次快照
  curl localhost:9323/metrics | grep container  # daemon metrics
  ```
  ```yaml
  # docker-compose.yml - 监控栈
  services:
    cadvisor:
      image: gcr.io/cadvisor/cadvisor:v0.49
      volumes:
        - /:/rootfs:ro
        - /var/run:/var/run:ro
        - /sys:/sys:ro
        - /var/lib/docker:/var/lib/docker:ro
      ports: ["8080:8080"]
    prometheus:
      image: prom/prometheus
      volumes: ["./prometheus.yml:/etc/prometheus/prometheus.yml"]
      ports: ["9090:9090"]
    loki:
      image: grafana/loki
      ports: ["3100:3100"]
    promtail:
      image: grafana/promtail
      volumes:
        - /var/lib/docker/containers:/var/lib/docker/containers:ro
        - ./promtail.yml:/etc/promtail/promtail.yml
      command: -config.file=/etc/promtail/promtail.yml
  ```
- 注意事项：cAdvisor 自身约 100MB 内存，集群规模大时换 metrics-server；`fluentd` 驱动阻塞风险高，故障时会让容器 stdout 卡住，优先 Loki+promtail。

**12. 资源清理与磁盘治理：prune / dangling 镜像 / system df**
- 概念解释：① **dangling 镜像**：`<none>:<none>` 的悬空层，新 build 覆盖旧 tag 后留下；② **dangling volume**：未被任何容器引用的匿名 volume；③ **`docker system df`** 查看镜像/容器/卷/缓存各占多少；④ **`docker system prune`** 清理停止的容器 + dangling 镜像 + 未使用网络 + 构建缓存；⑤ **`-a`** 额外清理所有未被容器引用的镜像（不只 dangling）。
- 核心作用：Docker 磁盘只增不减是生产事故的高频原因，定期清理是必修课。
- 基本用法：
  ```bash
  docker system df -v                # 详细到每个镜像
  docker system prune                # 清停止容器 + dangling 镜像 + 未用网络 + 构建缓存
  docker system prune -a             # 加上所有未被引用的镜像
  docker system prune -a --volumes   # 再加上未使用的 volume（危险！谨慎）
  docker image prune -a --filter "until=168h"   # 只清 7 天前的
  docker builder prune --all --filter "until=24h"
  # 自动化：cron 每周清理
  0 3 * * 0 docker system prune -a --filter "until=168h" -f
  ```
- 注意事项：`--volumes` 会删数据卷，务必确认；`prune -a` 会删除所有非运行容器引用的镜像，包括你刚 pull 备用的；建议先 `df -v` 看清楚再删。

**13. CIS Docker Benchmark 与 K8s 衔接**
- 概念解释：① **CIS Docker Benchmark** 是 Center for Internet Security 发布的 Docker 加固基线（约 100+ 项检查），覆盖宿主配置、daemon 配置、镜像构建、容器运行时四类，可用 `docker-bench-security` 开源脚本一键审计；② **从 Compose 到 K8s**：单机 Compose 起步 → `kompose convert` 转 K8s YAML → 生产用 Helm/Kustomize 编排；Compose 适合开发与小规模部署，K8s 适合大规模、自愈、滚动升级场景。
- 核心作用：CIS 提供可量化的安全基线，K8s 衔接让容器从单机走向生产编排。
- 基本用法：
  ```bash
  # 运行 CIS 审计
  docker run --rm --net host --pid host --userns host --cap-add audit_control \
    -e DOCKER_CONTENT_TRUST=$DOCKER_CONTENT_TRUST \
    -v /var/lib:/var/lib:ro \
    -v /var/run/docker.sock:/var/run/docker.sock:ro \
    -v /etc:/etc:ro \
    --label docker_bench_security \
    docker/docker-bench-security

  # Compose → K8s
  kompose convert -f docker-compose.yml -o k8s/
  kubectl apply -f k8s/
  ```
- 注意事项：CIS 部分项与性能/便利性冲突（如 `icc: false` 影响容器通信），需按业务取舍；kompose 转换结果不能直接上生产，需补充 probes/resources/affinity 等。

---

### 章节题目

#### 【面试题】

**1. 题目：请完整描述一个生产级 Dockerfile 的安全加固清单，并解释每条的作用。**
- 难度：进阶
- 来源：字节 / 阿里云原生岗面试真题
- 答案要点：
  1. 多阶段构建，最终镜像只含运行时（去除编译器/源码）
  2. 基础镜像选 `distroless`/`alpine`/`scratch`，固定 digest 而非 tag
  3. `USER nonroot` 非 root 运行
  4. `--cap-drop ALL --cap-add <必要项>` 移除 capabilities
  5. `--read-only` + `--tmpfs /tmp` 只读根文件系统
  6. `--security-opt no-new-privileges` 禁止 setuid 提权
  7. `--security-opt seccomp=/path/profile.json` 启用自定义 seccomp
  8. `-m --cpus --pids-limit` 资源限制
  9. `HEALTHCHECK` 探活
  10. 镜像扫描（Scout/Trivy）+ 镜像签名（cosign）
  11. `.dockerignore` 排除敏感文件
  12. `ENTRYPOINT ["./app"]` exec 形式，PID 1 信号转发
- 考点：综合加固能力、纵深防御思维。

**2. 题目：容器逃逸（container escape）有哪些常见路径？如何防御？**
- 难度：深度
- 来源：腾讯安全面试题
- 答案要点：
  - 路径①：`--privileged` 模式 → 容器能看到宿主所有设备，`nsenter`/挂载宿主磁盘直接逃逸。防御：禁用 privileged。
  - 路径②：`docker.sock` 挂进容器 → 容器内用 docker client 创建特权容器逃逸。防御：不挂 socket，必须挂则用 `socket-proxy` 只放白名单 API。
  - 路径③：内核漏洞（Dirty COW CVE-2016-5195、CVE-2022-0847 dirty pipe）→ 通过 syscall 穿透 namespace。防御：及时升级内核、用 gVisor/Kata 隔离。
  - 路径④：CAP_SYS_ADMIN/CAP_DAC_READ_SEARCH → 读宿主文件。防御：cap-drop ALL。
  - 路径⑤：共享 namespace（`--pid=host`/`--net=host`）。防御：禁止共享。
  - 路径⑥：敏感挂载（`/`、`/proc`、`/sys`）。防御：只读挂载或不挂。
- 考点：逃逸原理、防御纵深。

#### 【论坛题】

**3. 题目：生产环境 `/var/lib/docker` 占满 100%，但 `docker images` 看不到大镜像，怎么排查？**
- 难度：进阶
- 来源：Stack Overflow 高赞问题 + 知乎"磁盘又满了"系列
- 答案要点：
  1. `docker system df -v` 看四类占用（镜像/容器/卷/构建缓存），重点看 Build Cache 和 Volume
  2. `du -sh /var/lib/docker/overlay2/* | sort -h` 找最大层
  3. `du -sh /var/lib/docker/volumes/*` 找匿名卷（dangling volume 常被遗忘）
  4. `docker logs <container>` 看是否某个容器日志 GB 级（json-file 默认无限制）
  5. `docker builder prune --all` 清构建缓存
  6. `docker volume prune` 清未使用卷（先 `volume ls -f dangling=true` 确认）
  7. 修复：`daemon.json` 加 `log-opts: {max-size: 10m, max-file: 3}` + cron 定期 `system prune`
- 考点：磁盘治理、daemon.json 调优。

**4. 题目：容器逃逸案例 CVE-2019-5736（runc）原理是什么？为什么 seccomp 防不住？**
- 难度：深度
- 来源：GitHub runc issue #2128、Hacker News 热议
- 答案要点：runc 在执行 `docker exec` 时会通过 `/proc/self/exe` 重新打开自身二进制，攻击者在容器内把 `/proc/self/exe` 替换为恶意脚本，宿主上 runc 进程随后执行了被替换的二进制，从而以 root 身份在宿主执行任意命令。seccomp 防不住因为攻击者只用了 `open`、`write` 等普通 syscall，不在默认黑名单内。
  - 防御：升级 runc ≥ 1.0-rc6；用 `--userns-remap` 让容器内 root 不是宿主 root；用 gVisor/Kata 沙箱运行时隔离内核。
- 考点：runc 原理、LSM 与 seccomp 的边界。

#### 【期末题/认证题】

**5. 题目（DCA 认证）：以下哪个 `docker run` 选项能阻止容器内进程通过 setuid 提权？**
- A. `--cap-drop ALL`
- B. `--read-only`
- C. `--security-opt no-new-privileges`
- D. `--userns-remap`
- 难度：基础
- 来源：Docker Certified Associate 模拟题
- 答案：C。`no-new-privileges` 内核参数直接禁止 setuid/setgid 提权，setuid 程序（如 sudo/ping）也无法获得 root。A 是移除 capabilities 但 setuid 不依赖 capability；B 是文件系统只读；D 是用户命名空间映射，与 setuid 提权无关。
- 考点：no-new-privileges 的精确语义。

**6. 题目（CIS Docker Benchmark 4.x）：CIS 推荐的 `docker run` 默认应禁用哪些 capabilities？**
- 难度：进阶
- 来源：CIS Docker Benchmark v1.6.0 Section 5.3
- 答案要点：CIS 5.3 要求"默认禁用所有不必要 capabilities"，推荐 `--cap-drop ALL` 后按需 add。默认 Docker 已 drop 部分高危能力（如 CAP_SYS_MODULE、CAP_SYS_ADMIN 实际仍存在），需手动 drop：`CAP_SYS_ADMIN`、`CAP_SYS_MODULE`、`CAP_SYS_PTRACE`、`CAP_DAC_READ_SEARCH`、`CAP_NET_ADMIN`、`CAP_NET_RAW`、`CAP_SYSLOG` 等。CIS 5.4 要求限制容器获取新权限（即 `no-new-privileges`）。审计命令：
  ```bash
  docker ps -q | xargs docker inspect --format '{{.Name}} caps={{.HostConfig.CapAdd}} nnp={{.HostConfig.SecurityOpt}}'
  ```
- 考点：CIS 基线、capability 最小化。

#### 【官网题】

**7. 题目：根据 Docker 官方安全文档，`--privileged` 与 `--cap-add=ALL` 的区别是什么？**
- 难度：进阶
- 来源：https://docs.docker.com/engine/security/
- 答案要点：
  - `--privileged` 不仅授予所有 capabilities，还会：①禁用 seccomp；②禁用 AppArmor/SELinux；③映射所有设备节点（`/dev/sda` 等块设备可见）；④移除 readonly mount 标记；④允许 `--cgroupns=host`。等于完全无隔离。
  - `--cap-add=ALL` 只是把 capabilities 全加上，但 seccomp/AppArmor/SELinux 仍生效，设备访问仍受限。
  - 官方建议：永远不要在生产用 `--privileged`；如需特定能力用 `--cap-add` 精确授予。
- 考点：privileged 的真实含义、纵深防御层次。

**8. 题目：Docker Scout 与 `docker scan`（旧 CLI）的关系？Scout 的 exposure 与 affected 概念区别？**
- 难度：进阶
- 来源：https://docs.docker.com/scout/
- 答案要点：`docker scan` 是 Docker 2020 推出的 CLI（基于 Snyk），2023 起被 Docker Scout 取代，`docker scan` 在 24.0 后弃用。Scout 引入"深度分析"概念：
  - **affected（受影响）**：镜像中实际包含且可被加载的包有 CVE。
  - **exposed（暴露）**：affected 且该包被应用实际使用（通过 reachability 分析），优先级更高。
  - 命令：`docker scout cves`（CVE 列表）、`docker scout recommendations`（修复建议）、`docker scout sbom`（生成 SBOM）、`docker scout compare`（版本对比）。
- 考点：Scout 演进、reachability 概念。

#### 【实战题】

**9. 题目：你的 Node.js 应用镜像 1.2GB，CI 构建需 8 分钟，请给出优化方案把镜像压到 < 200MB、构建压到 < 2 分钟。**
- 难度：实战
- 来源：某互联网公司镜像治理项目
- 答案要点：
  - 镜像优化：
    1. 多阶段构建：`node:20` 编译 → `node:20-alpine` 运行（约 150MB）
    2. `npm prune --production` 去掉 devDependencies
    3. `.dockerignore` 排除 `node_modules`/`test`/`docs`/`.git`
    4. USER nonroot，distroless 可进一步压到 ~120MB
    5. 固定 base image digest
  - 构建优化：
    1. `# syntax=docker/dockerfile:1.7` 启用 BuildKit
    2. `RUN --mount=type=cache,target=/root/.npm npm ci` 复用 npm 缓存
    3. 先 `COPY package*.json` 再 `npm ci`，利用层缓存避免源码改动重新装包
    4. `--cache-from type=registry,ref=...:buildcache` CI 跨 runner 共享缓存
    5. `--cache-to type=inline` 或 `type=registry,mode=max`
    6. 用 buildx 并行多阶段（前端/后端/工具阶段）
  - 验证：`docker history --no-trunc myapp:1.2.3 | sort -k1 -h` 看每层大小；`trivy image` 看 CVE 是否减少。
- 考点：多阶段 + BuildKit + 缓存的综合应用。

**10. 题目：凌晨告警"某节点 /var/lib/docker 使用率 95%"，请给出完整排查与根治方案。**
- 难度：实战
- 来源：真实生产事故复盘
- 答案要点：
  - 现场止血：
    1. `docker system df -v` 定位是哪一类占用（镜像/容器/卷/构建缓存）
    2. `du -sh /var/lib/docker/containers/*/` 看是否有容器日志 GB 级
    3. 立即 `truncate -s 0 /var/lib/docker/containers/<id>/<id>-json.log` 截断（不停容器）
    4. `docker system prune -a --filter "until=24h" -f` 清 24h 前未引用镜像
  - 根因定位：
    - 若是日志：`daemon.json` 未配 `log-opts`，应用狂打日志
    - 若是构建缓存：CI 在节点上 build 未清理，`docker builder prune --all -f`
    - 若是匿名卷：`docker volume ls -f dangling=true` 列出后 `docker volume prune`
    - 若是 overlay2 层堆积：有大量 `<none>` 镜像，`docker image prune -a`
  - 根治：
    1. `daemon.json` 加 `"log-opts": {"max-size":"10m","max-file":"3"}`
    2. 启用 `live-restore: true` 后改 daemon.json 不重启容器
    3. cron 每周 `docker system prune -a --filter "until=168h" -f`
    4. Prometheus + node_exporter 监控 `/var/lib/docker` 使用率，> 80% 告警
    5. CI runner 与生产节点隔离，避免构建缓存污染
- 考点：磁盘治理、daemon.json、监控告警。

**11. 题目：把一个 docker-compose.yml 部署的 3 服务应用（web + api + db）改造为可在 K8s 生产使用，需要补哪些字段？**
- 难度：实战
- 来源：某团队上云项目
- 答案要点：用 `kompose convert` 转换后必须补充：
  - `resources.requests/limits`（CPU/内存）
  - `livenessProbe` + `readinessProbe`（HTTP/TCP/exec）
  - `affinity`/`topologySpreadConstraints`（多副本跨节点）
  - `PodDisruptionBudget`（保证滚动升级可用副本数）
  - `NetworkPolicy`（默认 deny all，按需放通）
  - `Secret` 替代 compose 中的 `environment` 明文密码
  - `PersistentVolumeClaim` 替代匿名 volume
  - `Service` 类型（ClusterIP 内部，Ingress 对外）
  - `SecurityContext`：`runAsNonRoot: true`、`readOnlyRootFilesystem: true`、`allowPrivilegeEscalation: false`、`capabilities.drop: [ALL]`
  - `HPA` 自动扩缩容
- 考点：Compose 与 K8s 差异、生产 K8s 必备字段。

---

### 项目常用场景

**场景1：生产镜像加固（从开发 Dockerfile 到生产 Dockerfile）**

背景：开发同学交付的 Dockerfile 跑得通但充满隐患——root 运行、基础镜像 1GB、无健康检查、latest tag。

解决方案（加固前后对比）：

```dockerfile
# === 加固前（开发版）===
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
```

```dockerfile
# === 加固后（生产版）===
# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --production

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app && \
    chown -R app:app /app
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/package.json ./
USER app:app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/healthz || exit 1
ENTRYPOINT ["node", "dist/main.js"]
```

```bash
# 构建并扫描
docker build -t myapp:1.2.3@sha256:abc... .
docker scout cves myapp:1.2.3
docker run --rm --read-only --cap-drop ALL --security-opt no-new-privileges \
  --tmpfs /tmp -m 512m --cpus 1 myapp:1.2.3
```

最佳实践：① tag 用语义版本 + digest 双锁定；② CI 集成 Trivy/Scout，CRITICAL CVE 直接 fail；③ 用 cosign 给镜像签名；④ 部署前 `docker image inspect` 验证 USER/Labels。

---

**场景2：daemon.json 全局调优（新节点初始化模板）**

背景：新装 Docker 节点默认配置对生产不友好——日志无限制、无镜像加速、重启 daemon 杀容器。

解决方案：

```json
// /etc/docker/daemon.json
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  },
  "live-restore": true,
  "userland-proxy": false,
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 5,
  "registry-mirrors": [
    "https://registry.docker-cn.com",
    "https://docker.mirrors.ustc.edu.cn"
  ],
  "insecure-registries": [],
  "userns-remap": "default",
  "icc": false,
  "no-new-privileges": true,
  "default-ulimits": {
    "nofile": { "Hard": 65536, "Soft": 65536 },
    "nproc": { "Hard": 4096, "Soft": 2048 }
  },
  "metrics-addr": "0.0.0.0:9323",
  "experimental": true,
  "default-runtime": "runc",
  "runtimes": {
    "kata-runtime": { "path": "/usr/bin/kata-runtime" }
  }
}
```

```bash
# 验证配置并热加载（live-restore=true 时容器不中断）
sudo dockerd --validate                 # 校验配置语法
sudo systemctl reload docker            # reload 而非 restart
docker info | grep -E "Storage|Logging|Live"  # 确认生效
```

最佳实践：① 用 Ansible/Puppet 统一推送 daemon.json；② 开启 `live-restore` 后 daemon 升级也不停容器；③ `userns-remap` 启用前先迁移存量容器；④ `metrics-addr` 配合 Prometheus 抓 daemon 自身指标。

---

**场景3：磁盘告警排查（90% 使用率应急流程）**

背景：Prometheus 告警 `node_filesystem_avail_bytes{mountpoint="/var/lib/docker"} < 10%`。

解决方案（应急 5 分钟内）：

```bash
# Step 1: 总览，看哪一类占用
docker system df

# Step 2: 详细到每个镜像/容器/卷
docker system df -v

# Step 3: 找最大的容器日志（最常见元凶）
du -sh /var/lib/docker/containers/*/*-json.log 2>/dev/null | sort -h | tail -5

# Step 4: 找最大的 overlay2 层
du -sh /var/lib/docker/overlay2/* 2>/dev/null | sort -h | tail -10

# Step 5: 找 dangling 卷
docker volume ls -f dangling=true

# Step 6: 止血 - 截断超大日志（不停容器）
truncate -s 0 /var/lib/docker/containers/<id>/<id>-json.log

# Step 7: 清理
docker system prune -a --filter "until=24h" -f
docker builder prune --all -f
docker volume prune -f   # 谨慎！先确认无引用

# Step 8: 根治 - 给日志失控的容器加限制
docker update --log-opt max-size=10m --log-opt max-file=3 <container_id>  # 24.0+ 支持
# 或修改 daemon.json 全局限制后 reload
```

监控告警配置：
```yaml
# prometheus alert
- alert: DockerDiskHigh
  expr: node_filesystem_avail_bytes{mountpoint="/var/lib/docker"} / node_filesystem_size_bytes{mountpoint="/var/lib/docker"} < 0.2
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Docker disk usage > 80% on {{ $labels.instance }}"
```

最佳实践：① daemon.json 预设 `log-opts` 从源头限制；② `/var/lib/docker` 单独挂盘，避免与系统盘相互影响；③ 每周 cron `docker system prune -a --filter "until=168h"`；④ CI runner 与生产节点隔离。

---

**场景4：容器逃逸演练与防御验证**

背景：安全团队要求验证容器加固是否有效，模拟攻击者从 webshell 到逃逸的路径。

解决方案：

```bash
# 1. 模拟未加固容器（对照组）
docker run -d --name vulnerable \
  --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /:/host \
  nginx:latest

docker exec -it vulnerable bash
# 攻击路径 A：privileged + 挂载根目录
chroot /host
# 攻击路径 B：docker.sock
curl -s --unix-socket /var/run/docker.sock http://localhost/containers/json
# 攻击路径 C：privileged 直接 mount 宿主磁盘
mkdir /mnt/host && mount /dev/sda1 /mnt/host

# 2. 加固后容器（实验组）
docker run -d --name hardened \
  --read-only \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --security-opt seccomp=/etc/docker/seccomp-strict.json \
  --security-opt apparmor=docker-default \
  --user 1000:1000 \
  --tmpfs /tmp \
  -m 256m --cpus 0.5 --pids-limit 50 \
  nginx:1.25-alpine

# 验证攻击路径全部失效：
# - privileged 路径：cap-drop ALL 后无法 mount
# - docker.sock 路径：未挂载 socket
# - 文件写入：read-only + 非 root
# - 提权：no-new-privileges
```

最佳实践：① 用 `docker/docker-bench-security` 跑 CIS 审计；② 高敏感场景换 gVisor（`--runtime=runsc`）或 Kata Containers；③ `--network=none` + 按需白名单出网；④ 定期复扫镜像 CVE。

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|------|------|---------|---------|
| **--cap-add** | **--cap-drop** | add 是授予特定 Linux capability；drop 是移除。生产做法是 `--cap-drop ALL` 再 `--cap-add <必要>` | drop ALL 是默认基线，add 仅在需要时（如 ping 需 NET_RAW） |
| **USER root（默认）** | **USER nonroot** | Docker 默认以 root 运行，容器内 root 在宿主上也是 uid=0（除非 userns-remap）；nonroot 用普通用户，即便逃逸也有限权限 | 生产必须 nonroot，开发调试可临时 root |
| **docker system prune** | **docker system prune -a** | 默认只清 dangling 镜像（`<none>` tag）；`-a` 清所有未被运行容器引用的镜像 | 谨慎用 `-a`，会删备用镜像；定期清理用默认 + `--filter until` |
| **scratch** | **distroless** | **alpine** | scratch 是空镜像（0 字节），需自带一切；distroless 有最小运行时（glibc/musl）但无 shell；alpine 有 shell + apk，5MB 但 musl libc 有兼容性问题 | 静态编译 Go/Rust 用 scratch；Java/Python 用 distroless；需调试用 alpine |
| **Docker Scout** | **Trivy** | Scout 是 Docker 官方深度集成（reachability 分析 + SBOM + Hub 集成），商业付费；Trivy 是 Aqua 开源（CNCF），免费、CI 友好、覆盖面广（IaC/秘密/镜像） | 企业已有 Docker Hub/Artifactory 选 Scout；预算敏感或需扫描 K8s/IaC 选 Trivy |
| **docker scan（旧）** | **docker scout cves（新）** | docker scan 是 2020 基于 Snyk 的 CLI，24.0 后弃用；scout 是 2023+ 的独立产品，分析更深（exposure vs affected） | 新项目一律用 scout |
| **--privileged** | **--cap-add=ALL** | privileged 同时禁用 seccomp/AppArmor/SELinux + 暴露所有设备；cap-add=ALL 只加 capabilities，其他防护仍生效 | 都不推荐；非要选则 cap-add=ALL，privileged 永不生产用 |
| **live-restore** | **systemctl restart docker** | live-restore=true 时 daemon 重启不杀容器（容器进程不被 SIGHUP）；restart 默认杀所有容器 | 生产节点升级 daemon 必开 live-restore |

---

### 常见陷阱与坑点

**陷阱1：root 容器逃逸**
- 现象：攻击者拿到容器内 RCE 后，通过 `--privileged` 或挂载的 `docker.sock` 直接在宿主执行命令，整个集群沦陷。
- 原因：容器内 root 默认就是宿主 uid=0（无 userns-remap），叠加 `--privileged` 移除所有隔离层，等于把宿主 root 交给攻击者。
- 解决方案：① Dockerfile 加 `USER nonroot`；② 运行时 `--cap-drop ALL`；③ 永远不用 `--privileged`，需要特权用 gVisor/Kata 沙箱运行时；④ 启用 `userns-remap=default`；⑤ 不挂 `docker.sock`，必须挂用 `tecnativa/docker-socket-proxy` 白名单 API。
- 预防措施：CI 阶段用 `docker/docker-bench-security` 跑 CIS 审计，发现 `Privileged=true` 直接 fail。

**陷阱2：json-file 日志撑爆磁盘**
- 现象：某天凌晨 `/var/lib/docker` 100%，所有容器写盘失败，服务雪崩。
- 原因：`json-file` 驱动默认 `max-size=0`（无限），应用狂打日志（如 DEBUG 模式未关），单容器日志累积到几十 GB。
- 解决方案：① `daemon.json` 全局 `"log-opts": {"max-size":"10m","max-file":"3"}`；② 应急 `truncate -s 0 <id>-json.log`；③ 应用日志走 stdout，由 promtail/fluentd 集中收集后限制大小。
- 预防措施：① 节点监控 `/var/lib/docker` 使用率 > 80% 告警；② `/var/lib/docker` 单独挂盘；③ 用 `local` 日志驱动（默认 100MB 轮转）替代 `json-file`。

**陷阱3：镜像含已知 CVE 上线**
- 现象：安全扫描发现线上 30% 镜像含 CRITICAL CVE（Log4Shell、Spring4Shell），但没人发现。
- 原因：CI 未集成扫描，或扫描结果未阻断流水线；base image 用 `latest`，被新 CVE 污染。
- 解决方案：① CI 强制 `trivy image --severity CRITICAL --exit-code 1`，CRITICAL 直接 fail；② base image 固定 digest（`FROM node:20.11.0-alpine@sha256:...`）；③ 定期 `docker scout recommendations` 获取修复建议；④ 用 `renovate`/`dependabot` 自动升级 base image。
- 预防措施：① 镜像仓库启用 admission controller（如 Kyverno）拒绝含 CRITICAL CVE 的镜像部署；② 每周扫描全量线上镜像。

**陷阱4：latest tag 漂移**
- 现象：同样的 `docker pull nginx:latest`，今早和昨晚拉的镜像内容不同，导致行为不一致甚至回滚失败。
- 原因：`latest` 是 mutable tag，镜像仓库可随时覆盖；`docker pull` 默认不检查本地缓存是否最新（除非 `--pull=always`）。
- 解决方案：① 生产镜像一律用语义版本 `myapp:1.2.3` + digest 双锁定 `myapp:1.2.3@sha256:abc...`；② CI 产物 push 后记录 digest 到物料库；③ 部署用 digest 而非 tag；④ K8s Deployment 用 `imagePullPolicy: IfNotPresent` + digest。
- 预防措施：仓库策略禁止覆盖已存在的 tag（Harbor/JFrog 支持 immutable tag）。

**陷阱5：--privileged 滥用（"调试万金油"）**
- 现象：开发同学遇到"容器内无法某操作"就加 `--privileged`，调试完忘记移除，生产沿用。
- 原因：`--privileged` 看似解决一切权限问题，实则是关闭所有隔离，等于把容器当虚拟机用。
- 解决方案：① 排查权限问题时先 `--cap-add` 精确授予；② 用 `docker inspect` 看实际生效的 caps；③ 生产环境用 OPA/Kyverno 策略拒绝 `Privileged=true` 的 Pod。
- 预防措施：CI 阶段 lint Dockerfile/Compose，发现 `privileged: true` 报警。

**陷阱6：PID 1 不转发信号，`docker stop` 卡 10 秒**
- 现象：`docker stop` 后容器要等 10 秒才退出，应用没机会清理数据库连接、刷盘。
- 原因：Dockerfile 用 shell 形式 `CMD npm start`，让 `sh` 成为 PID 1，`sh` 默认不转发 SIGTERM 给子进程；或者应用没注册 signal handler。
- 解决方案：① 用 exec 形式 `ENTRYPOINT ["./app"]` 让应用直接成为 PID 1；② 应用代码注册 SIGTERM handler 做优雅关闭；③ Node.js 用 `graceful-shutdown` 库，Java 用 Spring Boot 的 `server.shutdown=graceful`；④ Compose 加 `stop_grace_period: 30s` 给足清理时间。
- 预防措施：CI 跑 `docker stop -t 30 <container>` 测试退出时间，>10s 报警。

---

### 实践信号

#### 官方进阶文档

- **Docker Engine Security**：https://docs.docker.com/engine/security/ — 学习重点：namespace/capabilities/seccomp/AppArmor/SELinux 的官方解释，privileged 的真实含义。
- **Docker Scout 官方文档**：https://docs.docker.com/scout/ — 学习重点：CVE 扫描、reachability 分析、SBOM 生成、CI 集成、Hub 集成。
- **BuildKit 缓存优化**：https://docs.docker.com/build/cache/optimize/ — 学习重点：`--mount=type=cache`、远程缓存、并行多阶段。
- **dockerd daemon.json 全字段**：https://docs.docker.com/engine/reference/commandline/dockerd/ — 学习重点：所有 daemon 配置项的语义。
- **CIS Docker Benchmark（社区版）**：https://github.com/docker/docker-bench-security — 学习重点：100+ 项检查的脚本实现。

#### 社区热议话题

- **容器逃逸路径全梳理**（来源于 GitHub awesome-container-escape + Hacker News）— 讨论要点：privileged、docker.sock、内核漏洞、CAP_SYS_ADMIN、CVE-2019-5736（runc）等逃逸手法与防御，是云原生安全面试的高频题。
- **镜像瘦身最佳实践**（来源于 Reddit r/docker + Stack Overflow 高赞）— 讨论要点：多阶段 + distroless + BuildKit 缓存把 Node/Java 镜像从 GB 压到 100MB 级，distroless vs alpine 的兼容性取舍。
- **Docker 磁盘只增不减**（来源于 Stack Overflow 6000+ 赞问题）— 讨论要点：`/var/lib/docker` 占满的五大原因（日志、构建缓存、dangling 卷、overlay2 层、stopped 容器）与根治方案。

#### 动手验证

请完成以下实践任务：

1. **镜像漏洞扫描对比**：拉取 `nginx:1.25` 与 `nginx:1.25-alpine`，分别用 `docker scout cves` 或 `trivy image` 扫描，对比 CRITICAL/HIGH CVE 数量与镜像大小，验证"最小基础镜像"的实际收益。
   ```bash
   docker pull nginx:1.25 && docker pull nginx:1.25-alpine
   docker scout cves nginx:1.25 | tee /tmp/full.log
   docker scout cves nginx:1.25-alpine | tee /tmp/alpine.log
   docker image ls | grep nginx   # 对比大小
   ```

2. **加固一个生产 Dockerfile**：任选一个自己写过的 Dockerfile，按本章"加固后"范式改造（多阶段 + USER nonroot + HEALTHCHECK + .dockerignore + BuildKit 缓存），构建后用 `docker inspect` 验证：① USER 不是 root；② Healthcheck 已配置；③ 镜像大小减少 50%+；④ `trivy image` CRITICAL=0。

3. **运行 CIS 审计**：在本机或测试节点运行 `docker/docker-bench-security`，记录 WARN/INF 项，针对至少 5 项 WARN 给出修复命令并执行，复跑审计验证项变为 PASS。

4. **容器逃逸演练**：参考"场景4"分别启动未加固与加固后的容器，尝试三条攻击路径（privileged chroot、docker.sock 调 API、mount 宿主磁盘），验证加固后全部失败。

5. **daemon.json 调优验证**：在测试节点配置本章"场景2"的 daemon.json，`systemctl reload docker` 后验证：① `docker info` 显示 live-restore 启用；② 现有容器未重启；③ 新启动容器日志被限制在 10m×5。

---

## 章节小结

本章围绕"把容器从开发机送上生产"这一目标，从**安全**、**性能**、**运维**三条主线展开：

- **安全**：容器安全是 Linux 内核机制的叠加（namespace + cgroups + capabilities + seccomp + LSM），不是虚拟机。生产加固的核心是"纵深防御 + 最小权限"——`--cap-drop ALL`、`--read-only`、`no-new-privileges`、非 root、最小基础镜像、漏洞扫描，缺一不可。`--privileged` 是万恶之源，永不生产用。
- **性能**：镜像优化靠多阶段 + 最小基础镜像 + .dockerignore；构建优化靠 BuildKit 缓存挂载 + 远程缓存 + 并行多阶段；运行优化靠 overlay2 + 日志限制 + healthcheck。
- **运维**：daemon.json 是全局基线，`live-restore` + 日志限制 + `userns-remap` 是生产三件套；磁盘治理靠 `system prune` + cron + 监控；监控用 Prometheus + cAdvisor + Loki 替代手工 `docker stats`；CIS Benchmark 提供可量化的安全基线。

掌握本章后，你应该能：① 写出通过 CIS 审计的生产 Dockerfile；② 排查并根治 `/var/lib/docker` 磁盘告警；③ 选择并集成合适的镜像扫描方案；④ 评估容器逃逸风险并加固；⑤ 平滑从 Compose 过渡到 K8s 生产编排。容器安全没有银弹，只有层层加固与持续扫描，才能让容器真正"生产可用"。
