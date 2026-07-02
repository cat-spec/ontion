## 第5章 容器运行与生命周期管理

### 核心知识点

> 容器的运行与生命周期管理是 Docker 使用中最核心的日常操作。掌握 `docker run` 的参数体系、容器从创建到销毁的完整状态流转、信号处理与 PID 1 行为，是排查生产事故、保障服务稳定运行的基础。

**1. docker run 完整参数体系**
- 概念解释：`docker run` 是从镜像创建并启动容器的唯一入口，等价于 `docker create` + `docker start`，参数覆盖了网络、存储、资源、环境、进程等所有维度。
- 核心作用：将镜像实例化为一个隔离的运行环境，并通过参数声明运行时配置。
- 基本用法：
  ```bash
  docker run -d \
    --name web \
    -p 8080:80 \
    -v /data/html:/usr/share/nginx/html:ro \
    -e ENV=prod \
    --restart unless-stopped \
    --network mynet \
    --memory=512m --cpus=1.5 \
    -u 1000:1000 \
    -w /app \
    --entrypoint "/app/run.sh" \
    nginx:1.25
  ```
- 常用参数分组：
  - **运行模式**：`-d`（后台）、`-it`（交互前台）、`--rm`（退出即删）
  - **标识**：`--name`、`-h`（hostname）、`-u`（user:group）
  - **网络**：`-p 主机:容器`、`--network`、`--dns`、`--add-host`
  - **存储**：`-v 主机:容器[:ro]`、`--mount type=bind/volume/tmpfs`、`--tmpfs`
  - **环境**：`-e K=V`、`--env-file`、`-w`（工作目录）
  - **进程**：`--entrypoint`、命令参数
  - **资源**：`--cpus`、`--cpu-shares`、`--memory`、`--memory-swap`、`--pids-limit`、`--ulimit`
  - **重启**：`--restart no|on-failure[:N]|always|unless-stopped`
  - **健康**：`--health-cmd`、`--health-interval`、`--health-retries`
- 注意事项：
  - `--entrypoint` 会清除镜像中的 `ENTRYPOINT`，但不会自动清空 `CMD`，需显式覆盖。
  - `-v` 使用绝对路径是 bind mount，使用名称是 named volume，二者语义不同。
  - `-it` 与 `-d` 通常不并用；`-itd` 会让容器进入交互但后台运行，常用于保留 stdin。

**2. 容器生命周期状态机**
- 概念解释：容器从 `create` 到 `rm` 经历一组明确状态：`created → running → paused → stopped(exited) → deleted`。
- 核心作用：理解状态流转才能正确选择管理命令，避免误操作（如对 paused 容器执行 stop 无效）。
- 状态流转：
  ```
  docker create        → created
  docker start         → running
  docker pause         → paused（冻结进程，Cgroups freezer）
  docker unpause       → running
  docker stop          → exited(0)（先 SIGTERM，10s 后 SIGKILL）
  docker kill          → exited(137)（直接 SIGKILL）
  docker restart       → stop + start
  docker rm            → deleted（必须先 stopped）
  docker rm -f         → 强制 kill + rm
  ```
- 注意事项：
  - `paused` 容器进程仍在内存中，但不调度执行，stop/kill 命令仍可对其生效但需先 unpause。
  - `exited` 状态的容器仍占用磁盘空间（写时复制层 + 日志），需 `rm` 才能彻底清理。
  - `docker restart` 与 `docker stop && docker start` 在重启策略 `--restart` 计数上行为不同。

**3. 进入容器：exec vs attach**
- 概念解释：`docker exec` 在运行中的容器内启动一个**新进程**；`docker attach` 连接到容器 PID 1 的标准输入输出。
- 核心作用：exec 用于调试/运维，attach 用于"接管"前台进程。
- 基本用法：
  ```bash
  docker exec -it web bash           # 开一个新 shell
  docker exec web nginx -t           # 不分配 TTY 执行检查
  docker attach web                  # 接管 PID 1 输出
  # 退出 attach 而不杀容器：Ctrl-P, Ctrl-Q（detach keys）
  ```
- 注意事项：
  - `attach` 退出时（`exit` 或 Ctrl-D）会向 PID 1 发送 SIGHUP，**容器会停止**，这是最常见的踩坑点。
  - `exec` 退出不影响容器主进程，推荐优先使用 exec。
  - 若镜像基于 distroless 没有 shell，`exec sh` 会失败，需使用 `exec /bin/busybox` 或在镜像中预留调试入口。

**4. 查看容器运行状态**
- 概念解释：Docker 提供多个层次的观测命令：列表、进程、资源、元数据。
- 核心命令：
  ```bash
  docker ps                  # 仅运行中的容器
  docker ps -a               # 含已退出的所有容器
  docker ps -q -f status=exited          # 筛选 exited 容器 ID
  docker ps --format '{{.Names}}\t{{.Status}}'
  docker top web             # 容器内进程列表（宿主机视角）
  docker stats               # 实时资源占用（CPU/内存/网络/IO）
  docker stats --no-stream   # 单次快照
  docker inspect web         # 完整 JSON 元数据
  docker inspect -f '{{.State.Pid}}' web   # 取宿主机 PID
  docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' web
  ```
- 注意事项：
  - `docker stats` 默认是流式输出，脚本中要加 `--no-stream`。
  - `docker inspect` 的 `State.ExitCode`、`State.OOMKilled`、`State.Error` 是排查异常退出的关键字段。
  - `docker top` 显示的是宿主机命名空间下的 PID，与容器内 PID（`State.Pid` 视角）不同。

**5. 容器日志与日志驱动**
- 概念解释：容器 stdout/stderr 被 Docker 守护进程接管，按日志驱动持久化或转发。
- 基本用法：
  ```bash
  docker logs web                          # 全部日志
  docker logs -f web                       # 跟踪（类似 tail -f）
  docker logs --tail 100 web               # 最后 100 行
  docker logs --since 30m web              # 最近 30 分钟
  docker logs --since 2026-07-01T00:00:00 --until 2026-07-01T12:00:00 web
  docker logs -t web                       # 带 RFC3339 时间戳
  docker logs --details web                # 显示附加键值
  ```
- 日志驱动（`--log-driver`）：
  - `json-file`（默认）：每个容器一个 JSON 文件，**无大小限制会撑爆磁盘**。
  - `none`：不收集日志（容器内 stdout 仍可见，但 docker logs 拿不到）。
  - `syslog` / `journald`：转发到系统日志。
  - `fluentd` / `gelf` / `awslogs` / `gcplogs`：转发到外部日志系统。
  - `local`：Docker 18.9+ 引入，自带轮转，推荐替代 json-file。
- 关键配置（json-file 防爆）：
  ```bash
  docker run --log-driver json-file \
             --log-opt max-size=10m \
             --log-opt max-file=3 \
             nginx
  ```
  或在 `/etc/docker/daemon.json` 全局配置：
  ```json
  {
    "log-driver": "json-file",
    "log-opts": { "max-size": "50m", "max-file": "5" }
  }
  ```
- 注意事项：`docker logs` 仅对 `json-file` / `journald` / `local` 驱动有效，其他驱动需到目标系统查看。

**6. 容器退出码（Exit Code）**
- 概念解释：容器退出后 `State.ExitCode` 反映终止原因，是排查的首要线索。
- 常见退出码：
  | 退出码 | 含义 |
  |--------|------|
  | 0 | 正常退出 |
  | 1 | 应用通用错误 |
  | 125 | docker run 本身失败（参数错误） |
  | 126 | 命令不可执行（无 x 权限） |
  | 127 | 命令未找到 |
  | 137 | 被 SIGKILL（128+9），常见于 OOM 或 `docker kill`、stop 超时 |
  | 139 | 段错误 SIGSEGV（128+11） |
  | 143 | 收到 SIGTERM 正常退出（128+15），常见于 `docker stop` |
- 排查命令：
  ```bash
  docker inspect -f '{{.State.ExitCode}} {{.State.OOMKilled}} {{.State.Error}}' web
  docker events --filter container=web    # 查看历史事件
  dmesg | grep -i 'killed process'       # 宿主机内核日志确认 OOM
  ```
- 注意事项：137 不一定是 OOM，也可能是 `docker kill` 或 stop 超时，需结合 `OOMKilled` 字段判断。

**7. 重启策略（Restart Policy）**
- 概念解释：`--restart` 决定容器退出后是否由 Docker 守护进程自动拉起。
- 四种策略：
  - `no`（默认）：不重启。
  - `on-failure[:N]`：仅当退出码非 0 时重启，可限制最大重启次数 N（避免无限重启风暴）。
  - `always`：任何退出都重启，包括 `docker stop` 后被守护进程重启（除非手动 rm）。
  - `unless-stopped`：类似 always，但若容器被 `docker stop` 显式停止，**守护进程重启后不再拉起**。
- 基本用法：
  ```bash
  docker run -d --restart unless-stopped nginx
  docker run -d --restart on-failure:5 nginx
  docker update --restart always web      # 在线修改
  ```
- 注意事项：
  - `always` 在宿主机重启后会拉起所有 `always` 容器，可能造成启动风暴。
  - `on-failure` 的次数计数器在容器手动 `start` 后重置。
  - 守护进程重启时，对 `always` 与 `unless-stopped` 的处理差异是面试高频点。

**8. 资源限制与 OOM Killer**
- 概念解释：通过 Cgroups v1/v2 限制容器可用的 CPU、内存、PID 等资源，防止单容器耗尽宿主机。
- 基本用法：
  ```bash
  docker run -d \
    --cpus="1.5"            \  # 总 CPU 核数（最直观）
    --cpu-shares=512        \  # 相对权重（默认 1024，争抢时按比例）
    --cpuset-cpus=0,1       \  # 绑定到指定 CPU 核
    --memory=512m           \  # 内存硬上限
    --memory-swap=1g        \  # 内存+swap 上限（必须 >= memory）
    --memory-reservation=256m \ # 软限，内存紧张时回收到此值
    --kernel-memory=128m    \  # 内核内存（已废弃，v2 不支持）
    --oom-kill-disable=true \  # 禁止 OOM 杀该容器（慎用，可能拖垮宿主）
    --pids-limit=200        \  # 最大进程数
    nginx
  ```
- OOM Killer 行为：
  - 当容器内存超过 `--memory` 且无法回收，内核 OOM Killer 杀掉容器内 oom_score 最高的进程（通常是主进程），容器退出码 137，`State.OOMKilled=true`。
  - 若 `--oom-kill-disable` 且容器超限，内核会杀宿主机其他进程，**生产慎用**。
  - Cgroups v2 中 `--memory-swap` 行为有变化，swap 上限需单独配置。
- 注意事项：
  - `--memory-swap` 设置为 `-1` 表示无限 swap；设置为与 `--memory` 相同值表示禁用 swap。
  - Java 应用需让 JVM 堆 < `--memory` 的 60-70%，预留元空间、线程栈、堆外内存。

**9. 健康检查（HEALTHCHECK）**
- 概念解释：Docker 内置健康检查机制，定期执行命令判定容器是否健康，状态变化触发 `health_status` 事件。
- Dockerfile 中定义：
  ```dockerfile
  HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1
  ```
- 运行时覆盖：
  ```bash
  docker run --health-cmd="curl -f http://localhost/ || exit 1" \
             --health-interval=30s \
             --health-timeout=3s \
             --health-retries=3 \
             --health-start-period=10s \
             nginx
  docker run --no-healthcheck nginx   # 禁用镜像中的 HEALTHCHECK
  ```
- 健康状态：
  - `starting` → `healthy` → `unhealthy`（连续 `--retries` 次失败）
  - 查询：`docker inspect -f '{{.State.Health.Status}}' web`
  - 失败日志：`docker inspect -f '{{json .State.Health.Log}}' web`
- 注意事项：
  - HEALTHCHECK 不等于 readiness probe，它仅修改状态，不自动重启容器；需配合 `--restart on-failure` 或编排系统（K8s/Swarm）才生效。
  - 健康检查命令在容器命名空间内执行，需确保检查工具（curl/wget）已安装。

**10. PID 1 与信号处理（生产关键）**
- 概念解释：容器内第一个进程（PID 1）承担特殊职责：接收信号、回收僵尸子进程。多数语言的默认行为不具备这些能力。
- 核心问题：
  - **信号转发缺失**：Java、Node.js、Python 的进程作为 PID 1 时，往往不会将 SIGTERM 转发给子进程，`docker stop` 等待 10s 超时后 SIGKILL，导致数据未落盘。
  - **僵尸进程累积**：PID 1 若不调用 `waitpid` 回收子进程，子进程退出后变为僵尸（Z 状态），长期累积耗尽 PID。
  - **SIGTERM 忽略**：某些 shell（如 `/bin/sh`）作为 PID 1 时不响应 SIGTERM，必须 SIGKILL。
- 解决方案：
  1. **使用 tini / dumb-init 作为 init 进程**：
     ```dockerfile
     # 方式一：Docker 25.x 内置
     # docker run --init nginx
     ENTRYPOINT ["/usr/bin/tini", "--"]
     CMD ["./app"]
     ```
     `--init` 标志自动注入 tini（位于 `/usr/bin/docker-init`），无需修改镜像。
  2. **应用直接注册信号处理**：
     ```python
     import signal, sys
     def handle(sig, frame):
         cleanup(); sys.exit(0)
     signal.signal(signal.SIGTERM, handle)
     ```
  3. **避免 shell 形式 ENTRYPOINT**：
     ```dockerfile
     # 错误：/bin/sh -c "python app.py"，信号被 sh 吞掉
     CMD python app.py
     # 正确：exec 形式，python 直接是 PID 1
     CMD ["python", "app.py"]
     ```
  4. **延长 stop 超时**：`docker stop -t 30 web` 给应用更多优雅退出时间。
- 注意事项：
  - Kubernetes Pod 的 `terminationGracePeriodSeconds` 默认 30s，超时后 SIGKILL，需与容器内 stop 超时协调。
  - Spring Boot 2.3+ 已内置优雅停机，但仍需 PID 1 能转发信号。
  - `docker run --init` 是最低成本的最佳实践，建议所有生产容器开启。

---

### 章节题目

#### 【面试题】

**Q1：docker exec 和 docker attach 的本质区别是什么？生产环境该用哪个？为什么？**
- 答案：
  - `exec` 在容器内**新开一个进程**（独立 PID），与 PID 1 互不影响，退出后容器继续运行。
  - `attach` **连接到 PID 1 的 stdin/stdout/stderr**，所有 attach 的终端共享同一输出流；退出（exit/Ctrl-D）会向 PID 1 发 SIGHUP 导致容器停止，仅 Ctrl-P Ctrl-Q 可安全 detach。
  - 生产环境优先用 `exec -it bash`（或 `sh`）调试；`attach` 仅在需要查看前台进程实时输出或交互接管时使用，且必须知道 detach keys。
- 考点：进程模型、信号语义、生产安全。难度：★★★

**Q2：四种重启策略（no/on-failure/always/unless-stopped）的对比，并说明 Docker 守护进程重启后的行为差异。**
- 答案：
  | 策略 | 退出码 0 | 退出码≠0 | 守护进程重启后 |
  |------|---------|----------|----------------|
  | no | 不重启 | 不重启 | 不重启 |
  | on-failure[:N] | 不重启 | 重启（计数 N 次） | 按当前状态判断，已 stop 的不拉起 |
  | always | 重启 | 重启 | **总是拉起**（即使之前被 stop） |
  | unless-stopped | 重启 | 重启 | 若之前**未被显式 stop**，则拉起；否则不拉起 |
  - 关键差异：`always` 在 daemon 重启后会拉起所有 always 容器（包括手动 stop 过的）；`unless-stopped` 尊重用户手动 stop 的意图，不再拉起。
- 考点：重启策略语义、daemon 重启行为。难度：★★★★

**Q3：容器内 PID 1 不处理 SIGTERM 会带来什么问题？如何解决？**
- 答案：
  - 问题：`docker stop` 发 SIGTERM 后，PID 1 不响应，Docker 等待 10s（默认 `-t 10`）后发 SIGKILL，应用无法优雅退出，导致：未刷盘数据丢失、连接未关闭、注册中心残留、消息队列消息丢失。
  - 解决方案：① 使用 `docker run --init` 注入 tini 作为 PID 1 转发信号并回收僵尸进程；② 应用层注册 SIGTERM handler；③ Dockerfile 使用 exec 形式 `CMD ["java", "-jar", "app.jar"]` 避免 shell 吞信号；④ 适当延长 `docker stop -t 30`。
- 考点：PID 1 责任、信号处理、生产优雅停机。难度：★★★★

#### 【论坛题】

**Q4：【来源：Stack Overflow】容器运行 `docker stop web` 卡住很久才退出，最后显示 exited(137)，怎么解决？**
- 答案：
  - 原因：容器 PID 1 未捕获 SIGTERM（典型为 shell 启动的 Java 进程、或未注册信号的 Node.js），10s 超时后被 SIGKILL，退出码 137。
  - 排查：`docker inspect web` 查看 `State.ExitCode` 与 `StopSignal`；检查 Dockerfile 是否用了 shell 形式 `CMD java -jar app.jar`。
  - 解决：① 改为 exec 形式 `CMD ["java","-jar","app.jar"]`；② 加 `docker run --init`；③ 应用注册 shutdown hook；④ 临时延长 `docker stop -t 60`。
- 考点：信号处理、stop 超时机制。难度：★★★

**Q5：【来源：Reddit r/docker】容器跑了几天后宿主机磁盘满了，但容器内文件不大，原因是什么？**
- 答案：
  - 首要嫌疑：json-file 日志驱动未配置轮转，`/var/lib/docker/containers/<id>/<id>-json.log` 持续增长。
  - 排查：`docker inspect -f '{{.LogPath}}' web` 找到日志文件路径，`du -sh /var/lib/docker/containers/*/` 定位大文件。
  - 解决：① 立即 `truncate -s 0 <log-path>`；② 配置 `/etc/docker/daemon.json`：
    ```json
    { "log-driver":"json-file", "log-opts":{"max-size":"50m","max-file":"5"} }
    ```
    重启 docker daemon 后对**新容器**生效；③ 或对单容器 `docker run --log-opt max-size=10m --log-opt max-file=3`；④ 长期方案切换 `--log-driver=local`（自带轮转）。
- 考点：日志驱动、磁盘治理。难度：★★★

**Q6：【来源：Docker Forums】容器日志明明有输出，为什么 `docker logs` 没有任何内容？**
- 答案：
  - 原因：日志驱动不是 `json-file` / `journald` / `local`，而是 `none` / `syslog` / `fluentd` 等，`docker logs` 命令对这些驱动不支持。
  - 排查：`docker inspect -f '{{.HostConfig.LogConfig.Type}}' web` 查看驱动类型。
  - 解决：① 改用 `--log-driver json-file` 重建容器；② 或到对应后端查看（如 `journalctl`、`/var/log/syslog`、fluentd）。
- 考点：日志驱动兼容性。难度：★★

#### 【期末题/认证题】

**Q7：【CKA 风格】给定一个 Running 状态的 Pod，其容器状态显示 `OOMKilled`，如何确认是容器资源限制触发，而不是宿主机 OOM？**
- 答案：
  - 步骤：
    1. `kubectl describe pod <name>` 查看 `Last State: Terminated, Reason: OOMKilled, Exit Code: 137`。
    2. `docker inspect <container-id>`（在节点上）确认 `State.OOMKilled: true`，区分于宿主机 OOM。
    3. 检查容器 `--memory` / Pod resources.limits.memory 是否过小。
    4. 宿主机层面：`dmesg | grep -i 'killed process'`，若被杀进程在容器 cgroup 内则为容器 OOM，否则为宿主机 OOM。
    5. `kubectl get events --field-selector involvedObject.name=<pod>` 看是否记录 `OOMKilling` 事件。
  - 解决：调大 limits.memory；优化应用内存（JVM -Xmx）；排查内存泄漏。
- 考点：OOM 判定、容器与宿主机边界。难度：★★★★

**Q8：【Docker 认证 DCA】下列关于 `docker run --rm` 的说法哪些是正确的？**
A. 容器退出后自动删除容器及其匿名 volume
B. 容器退出后自动删除容器，但保留 named volume
C. 与 `-d` 不能同时使用
D. 删除时会一并清理容器在 docker run 时创建的 network
- 答案：**B、D**
  - A 错：`--rm` 只删除匿名 volume（即 `-v /path` 形式），不删除 named volume（`-v name:/path`）。
  - B 对。
  - C 错：`-d` 与 `--rm` 可同时使用，常用于一次性后台任务。
  - D 对：`--rm` 会删除 `--network` 创建的匿名网络（但保留外部 named network）。
- 考点：--rm 清理范围、volume 类型。难度：★★★

#### 【官网题】

**Q9：【来源 docker run reference】`docker run -it` 中 `-i` 和 `-t` 各代表什么？为什么通常一起使用？**
- 答案（依据 docs.docker.com/engine/reference/run/）：
  - `-i` (`--interactive`)：保持 STDIN 打开，即使未 attach。
  - `-t` (`--tty`)：分配一个伪终端（pseudo-TTY）。
  - 一起使用场景：交互式 shell（如 `bash`）需要 TTY 才能正确显示提示符、支持命令行编辑与颜色；缺 `-t` 则退格/方向键乱码，缺 `-i` 则无法输入。
  - 单独使用：`-i` 常用于管道输入 `echo "data" | docker run -i alpine cat`；`-t` 单独使用很少。
  - 注意：脚本中调用容器应避免 `-t`，否则管道行为异常。
- 考点：TTY/STDIN 概念、参数组合。难度：★★

**Q10：【来源 docker run reference】`--memory-swap` 与 `--memory` 的关系如何？设置为 `-1` 或与 memory 相等分别意味着什么？**
- 答案（依据 docs.docker.com/engine/reference/run/#user-memory-constraints）：
  - `--memory-swap` = `--memory` + swap 上限，必须 >= `--memory`。
  - 设为 `-1`：容器可使用无限 swap（仅受宿主机限制）。
  - 设为与 `--memory` 相同值：**禁用 swap**（swap 部分为 0）。
  - 默认未设置时：容器 swap 上限 = 宿主机 swap 上限，且与 memory 无强约束。
  - 注意：Cgroups v2 下 swap 计算方式不同，`memory.swap.max` 是 swap 独占部分，而非总和。
- 考点：内存限制语义、Cgroups v1/v2 差异。难度：★★★★

#### 【实战题】

**Q11：生产环境中一个 Java 8 容器（镜像 openjdk:8-jre）频繁 OOMKilled，但 JVM 堆 dump 显示堆未满。如何排查与解决？**
- 答案：
  - 根因：Java 8 早期版本未感知 Cgroups，`-Xmx` 默认取宿主机内存的 1/4，导致 JVM 堆 + 元空间 + 堆外（线程栈、DirectByteBuffer、JNI）超过容器 `--memory` 限制触发 OOM。
  - 排查步骤：
    1. `docker inspect -f '{{.State.OOMKilled}} {{.HostConfig.Memory}}' <c>` 确认容器 OOM 与限制值。
    2. `docker stats` 观察容器内存增长曲线。
    3. 进入容器 `jcmd <pid> VM.native_memory`（需 Native Memory Tracking）查看堆外占用。
    4. `jinfo -flags` 确认 Xmx 是否被错误放大。
  - 解决方案：
    1. 升级到 Java 8u191+ 或 Java 11（已支持 Cgroups v1/v2，`UseContainerSupport` 默认开启）。
    2. 显式限制 JVM：`-XX:MaxRAMPercentage=75 -XX:InitialRAMPercentage=50`。
    3. 容器 `--memory=2g` 时，JVM 堆建议 ≤ 1.4g，预留 30% 给堆外。
    4. 监控 DirectByteBuffer、线程数（`--pids-limit`、`-XX:ThreadStackSize`）。
  - 预防：所有 Java 容器统一启用 `--init` + 显式 RAMPercentage，监控容器 RSS 而非 JVM 堆。
- 考点：Java 容器化、Cgroups 感知、堆外内存。难度：★★★★★

**Q12：批量清理已退出的容器但保留 named volume，写出命令并解释。**
- 答案：
  ```bash
  # 方法一：筛选删除
  docker rm $(docker ps -aq -f status=exited)

  # 方法二：docker container prune（更推荐，保留 volume）
  docker container prune -f
  # 等价于
  docker container prune --filter "until=24h" -f   # 只删 24h 前退出的
  ```
  - 说明：
    - `docker rm` 默认不删除 volume（无论 named 还是匿名），匿名 volume 会变成 dangling。
    - `docker container prune` 同样不删 volume，清理 volume 需 `docker volume prune`（仅删 dangling 匿名 volume，named 需 `-f` 或显式 `docker volume rm`）。
    - 生产建议先 `docker ps -a -f status=exited --format '{{.Names}} {{.Mounts}}'` 人工核对再删。
- 考点：批量操作、prune 与 rm 的清理范围、volume 保留。难度：★★★

**Q13：容器卡在 `paused` 状态，`docker stop` 提示无响应，如何强制清理？**
- 答案：
  - 原因：paused 状态下进程被 Cgroups freezer 冻结，stop 的 SIGTERM 无法被处理。
  - 步骤：
    1. `docker unpause <c>` 解除冻结（可能本身卡住，因 Docker daemon 与 runc 通信问题）。
    2. 若 unpause 也卡，重启 Docker daemon 前先 `docker kill <c>`（直接 SIGKILL）。
    3. 若 daemon 也卡死：定位容器进程 `docker inspect -f '{{.State.Pid}}' <c>` → 宿主机 `kill -9 <pid>`，再 `docker rm -f <c>`。
    4. 极端情况需重启 dockerd：`systemctl restart docker`，期间所有容器网络短暂中断。
  - 预防：避免对生产容器用 pause（暂停期间连接超时），改用滚动更新或临时摘流。
- 考点：pause 机制、daemon 卡死排查。难度：★★★★

---

### 项目常用场景

**场景1：限制 Java/Spring Boot 应用的内存与 CPU**
- 背景：Java 容器 OOM 是生产事故 Top1，根因多为 JVM 不感知容器内存限制。
- 解决方案：
  ```bash
  docker run -d \
    --name order-service \
    --restart unless-stopped \
    --init \                              # tini 处理信号与僵尸
    --memory=2g --memory-swap=2g \        # 禁用 swap
    --cpus=2 \
    --pids-limit=1000 \
    --health-cmd="curl -f http://localhost:8080/actuator/health || exit 1" \
    --health-interval=30s --health-retries=3 \
    --log-driver json-file \
    --log-opt max-size=50m --log-opt max-file=5 \
    -e JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError" \
    -p 8080:8080 \
    openjdk:17-jre-slim \
    java $JAVA_OPTS -jar /app/app.jar
  ```
- 最佳实践：
  - `MaxRAMPercentage=70`：堆占总内存 70%，预留 30% 给元空间/线程栈/堆外。
  - `ExitOnOutOfMemoryError`：OOM 时进程立即退出，配合 `--restart on-failure` 快速重启。
  - `--init` 必开，避免 Spring Boot 的 shutdown hook 因信号未转发而失效。
  - 禁用 swap（`memory-swap=memory`）让 OOM 行为可预测。

**场景2：生产容器日志实时查看与归档**
- 背景：容器多、日志量大，需要实时排查问题并长期归档。
- 解决方案：
  ```bash
  # 实时跟踪多个容器（聚合到一处）
  docker logs -f --tail=50 --since=10m order-service

  # 导出某时段日志到文件
  docker logs --since 2026-07-01T00:00:00 \
              --until 2026-07-01T06:00:00 \
              -t order-service > /tmp/order-$(date +%Y%m%d).log

  # 宿主机直接读取 json-file（容器还在运行）
  LOG_PATH=$(docker inspect -f '{{.LogPath}}' order-service)
  sudo cat "$LOG_PATH" | jq -r '.log' > /tmp/order-full.log

  # 配置 daemon.json 全局轮转（所有新容器生效）
  cat <<'EOF' | sudo tee /etc/docker/daemon.json
  {
    "log-driver": "json-file",
    "log-opts": { "max-size": "100m", "max-file": "10" }
  }
  EOF
  sudo systemctl restart docker
  ```
- 最佳实践：
  - 单容器日志上限 = `max-size × max-file`（如 100m×10=1G）。
  - 长期归档建议 `--log-driver=fluentd` 转发到 ELK / Loki，不依赖本地文件。
  - 切换 `--log-driver=local`（Docker 18.9+）可省去 max-size 配置，自带二进制轮转。

**场景3：排查容器异常退出（exit 137）**
- 背景：服务容器频繁自动重启，事件显示 exit 137，需定位是 OOM 还是 kill。
- 排查流程：
  ```bash
  # 1. 确认退出码与 OOM 标记
  docker inspect -f 'Exit={{.State.ExitCode}} OOMKilled={{.State.OOMKilled}} Reason={{.State.Error}}' order-service

  # 2. 查看容器事件历史
  docker events --since 1h --until now --filter container=order-service

  # 3. 宿主机内核日志确认 OOM
  sudo dmesg -T | grep -iE 'oom|killed process' | tail -50

  # 4. 查看资源使用历史（需先开启 docker stats 监控或 Prometheus）
  docker stats --no-stream order-service

  # 5. 查看重启次数
  docker inspect -f '{{.RestartCount}}' order-service

  # 6. 应用日志线索
  docker logs --since 30m order-service | tail -200
  ```
- 决策树：
  - `OOMKilled=true`：上调 `--memory` 或优化应用内存，配合 cAdvisor 监控 RSS。
  - `OOMKilled=false` 但 dmesg 有 OOM：宿主机级 OOM 杀了容器进程，需扩容宿主机或疏散容器。
  - `OOMKilled=false` 且 dmesg 无 OOM：被人为 `docker kill` 或编排系统杀，查 `docker events`。
- 最佳实践：所有生产容器接入 cAdvisor + Prometheus + Grafana，监控 `container_memory_rss`、`container_oom_events_total`。

**场景4：优雅滚动重启而不丢请求**
- 背景：Spring Boot 服务需发版，不能让用户感知到 5xx。
- 解决方案：
  ```bash
  # 1. 先摘流（如从负载均衡摘除）
  curl -X POST http://lb:9090/deregister/order-service

  # 2. 等待处理中的请求完成（actuator 暴露 inFlightRequests）
  while [ "$(curl -s localhost:8080/actuator/metrics/tomcat.threads.busy | jq .measurements[0].value)" -gt 0 ]; do
    sleep 1
  done

  # 3. 优雅 stop（给 60s 处理 SIGTERM）
  docker stop -t 60 order-service

  # 4. 拉新版本
  docker run -d --name order-service ... order-service:v2

  # 5. 健康检查通过后注册回 LB
  until curl -sf localhost:8080/actuator/health; do sleep 2; done
  curl -X POST http://lb:9090/register/order-service
  ```
- 最佳实践：
  - 应用层 `server.shutdown=graceful`（Spring Boot 2.3+）。
  - Dockerfile exec 形式 + `--init` 保证 SIGTERM 到达。
  - `docker stop -t` 应大于应用最大请求处理时间。

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|----------|----------|
| `docker exec -it` | `docker attach` | exec 开新进程；attach 接管 PID 1 的 stdio，退出会停容器 | 调试用 exec；查看/接管前台进程用 attach（需 Ctrl-P Q 退出） |
| `docker stop` | `docker kill` | stop 先 SIGTERM 等待 10s 后 SIGKILL（优雅）；kill 默认 SIGKILL（强制，退出码 137） | 正常运维用 stop；紧急强制用 kill；kill 也可发其他信号 `kill -s SIGUSR1` |
| `docker pause` | `docker stop` | pause 用 Cgroups freezer 冻结进程（仍在内存）；stop 终止进程 | pause 用于临时冻结（如做镜像快照）；stop 用于正常停止 |
| `--restart always` | `--restart unless-stopped` | daemon 重启后 always 总是拉起（含手动 stop 过的）；unless-stopped 尊重手动 stop | 生产服务用 always（daemon 重启自动恢复）；unless-stopped 适合开发环境（手动 stop 后不希望被拉起） |
| `--rm` | 手动 `docker rm` | --rm 退出即删（含匿名 volume + 匿名 network）；手动 rm 需容器已停止，不删 volume | 一次性任务用 --rm；长跑容器需保留退出状态用于排查，用手动 rm |
| `kill` 默认信号 | `stop` 默认信号 | kill 默认 SIGKILL（不可捕获，退出码 137）；stop 默认 SIGTERM（可捕获，10s 后升级为 SIGKILL） | 需要应用处理就用 stop 或 `kill -s TERM`；紧急就 `kill` |
| `-v /data:/data` | `-v data:/data` | 前者是 bind mount（绝对路径，宿主机直接挂载）；后者是 named volume（Docker 管理，生命周期独立） | 配置文件/日志用 bind mount；数据/共享卷用 named volume |
| `docker logs` | 容器内 `cat /var/log/app.log` | 前者读 stdout/stderr（由 docker 接管）；后者读应用写到容器内文件的日志 | 应用输出到 stdout 用 docker logs；应用写到文件需进容器或挂载日志卷 |

---

### 常见陷阱与坑点

**陷阱1：`-d` 后台运行后看不到输出，以为容器没启动**
- 现象：`docker run -d nginx` 返回容器 ID，但 `docker ps` 看不到，`docker ps -a` 显示已 exited。
- 原因：容器内前台进程（如 nginx daemon off）启动失败或立即退出，`-d` 只是后台化启动过程，不代表持续运行。
- 解决：`docker logs <id>` 查看退出原因（如端口冲突、配置错误）；`docker run -d nginx` 后立即 `docker ps` 确认状态。
- 预防：`docker run -d` 后用 `docker ps -f name=xxx` 校验 Running 状态，配合 `--health-cmd` 自动检测。

**陷阱2：容器内 PID 1 不处理 SIGTERM，stop 永远超时**
- 现象：`docker stop` 卡 10s 才生效，日志无优雅退出记录。
- 原因：Dockerfile 用了 shell 形式 `CMD java -jar app.jar`，实际 PID 1 是 `/bin/sh -c`，sh 不转发信号给 java。
- 解决：改 exec 形式 `CMD ["java","-jar","app.jar"]`；或加 `docker run --init`；或应用注册 `Runtime.addShutdownHook`。
- 预防：所有生产镜像统一使用 exec 形式 ENTRYPOINT/CMD + `--init`。

**陷阱3：json-file 日志撑爆磁盘，宿主机不可用**
- 现象：宿主机 `/var/lib/docker` 占满，新容器无法启动，docker daemon 异常。
- 原因：默认 `json-file` 驱动无大小限制，容器 stdout 高频输出，单日志文件增长到数十 GB。
- 解决：紧急 `truncate -s 0 /var/lib/docker/containers/*/*-json.log`；长期在 `/etc/docker/daemon.json` 配置 `max-size` + `max-file`，重启 daemon。
- 预防：① 上线前在 daemon.json 配置全局轮转；② 高日志量服务改用 `fluentd` 转发；③ 定期 `docker system df` 监控。

**陷阱4：容器 OOM 被杀但应用无感知，数据丢失**
- 现象：容器退出码 137，应用日志无任何异常，部分事务未提交。
- 原因：内核 OOM Killer 直接 SIGKILL 容器进程，应用来不及执行 cleanup；`--memory` 设得太小或 JVM 堆外内存超预期。
- 解决：① 上调 `--memory`；② 应用层 `ExitOnOutOfMemoryError` 让 OOM 时快速退出由重启策略拉起；③ 监控 `container_memory_rss` 接近阈值时告警。
- 预防：所有容器显式设置 `--memory` 与 `--cpus`，避免无限制；Java 应用 `MaxRAMPercentage` 控制堆占比。

**陷阱5：`docker run -it` 进入容器后 Ctrl-C 直接杀掉容器**
- 现象：在 `docker run -it nginx bash` 中按 Ctrl-C 想终止当前命令，结果整个容器退出。
- 原因：Ctrl-C 发送 SIGINT 到 PID 1（bash），bash 作为 PID 1 退出导致容器停止。
- 解决：用 `docker exec -it <c> bash` 进入已运行容器，Ctrl-C 只影响当前前台命令；或在原 run 命令中用 `--detach-keys=ctrl-e` 改 detach 键。
- 预防：调试优先 exec 而非 run -it；生产容器不用 `-it` 启动。

**陷阱6：`--memory-swap` 比 `--memory` 小导致启动失败**
- 现象：`docker run --memory=1g --memory-swap=512m nginx` 报错 `Minimum memoryswap limit should be larger than memory limit`。
- 原因：swap 总额 = memory + swap，必须 >= memory。
- 解决：设为 `--memory-swap=2g`（允许 1g swap）；或与 memory 相等禁用 swap；或 `-1` 不限 swap。
- 预防：理解公式 `swap_total = memory + swap_exclusive`，先设 memory 再设 swap。

---

### 实践信号

#### 官方进阶文档
- docker run reference（参数最全）：https://docs.docker.com/engine/reference/run/
- docker run CLI 命令：https://docs.docker.com/engine/reference/commandline/run/
- 容器资源管理（CPU/Memory/OOM）：https://docs.docker.com/config/containers/resource_constraints/
- 日志与日志驱动：https://docs.docker.com/config/containers/logging/
- 健康检查：https://docs.docker.com/engine/reference/builder/#healthcheck
- 重启策略：https://docs.docker.com/config/containers/start-containers-automatically/
- docker init（tini）：https://docs.docker.com/engine/reference/run/#specify-an-init-process

#### 社区热议话题
- **PID 1 与僵尸进程问题**：https://github.com/krallin/tini （tini 项目与背景说明）以及 phusion baseimage 经典讨论 "Docker and the PID 1 zombie reaping problem"。
- **Java 容器内存感知**：Java 8u191 后 `UseContainerSupport` 演进，社区大量对比 MaxRAMPercentage vs -Xmx 的实践（OpenJDK 官方博客 "Java in Containers"）。
- **docker logs 性能瓶颈**：json-file 在高并发下成为 daemon 锁瓶颈，社区推荐 local 或 fluentd（Docker GitHub issue #28641 等）。
- **--init 是否必选**：Reddit r/devops 与 Hacker News 多次讨论是否所有生产容器都该开 --init。

#### 动手验证
1. **观察信号处理差异**：
   ```bash
   # 不加 --init
   docker run -d --name no-init --entrypoint sh alpine -c 'trap "echo got TERM; exit 0" TERM; while true; do sleep 1; done'
   time docker stop no-init    # 观察耗时与日志

   # 加 --init
   docker run -d --init --name with-init --entrypoint sh alpine -c 'trap "echo got TERM; exit 0" TERM; while true; do sleep 1; done'
   time docker stop with-init
   ```
   验证：对比 stop 耗时与日志中是否出现 "got TERM"。

2. **复现并解决 OOM**：
   ```bash
   docker run -d --name oom-test --memory=100m python:3.11-slim \
     python -c "x=[]; [x.append(b'*'*1024*1024) for _ in range(200)]"
   sleep 5
   docker inspect -f '{{.State.ExitCode}} {{.State.OOMKilled}}' oom-test
   dmesg | tail -20
   ```
   验证：看到 exit 137、OOMKilled=true，dmesg 有 killed process。

3. **对比四种重启策略**：
   ```bash
   for p in no on-failure always unless-stopped; do
     docker run -d --name test-$p --restart $p alpine sh -c 'exit 1'
   done
   sleep 10
   docker ps -a --filter "name=test-" --format '{{.Names}} {{.Status}}'
   # 观察 on-failure 重启次数 vs always/unless-stopped 一直重启
   ```

4. **验证日志轮转配置**：
   ```bash
   docker run -d --name log-test \
     --log-driver json-file \
     --log-opt max-size=1m --log-opt max-file=3 \
     alpine sh -c 'while true; do echo "$(date) hello"; done'
   LOG=$(docker inspect -f '{{.LogPath}}' log-test)
   watch "ls -lh $(dirname $LOG)"
   ```
   验证：日志文件达到 ~1M 后轮转，最多保留 3 个。

---

## 章节小结

本章覆盖了容器运行与生命周期的全链路：从 `docker run` 的完整参数体系，到容器从 created 到 deleted 的状态流转，再到 exec/attach、日志、退出码、重启策略、资源限制、健康检查与 PID 1 信号处理。

生产实践中最关键的四个要点：
1. **PID 1 与信号处理**：所有生产容器统一 `--init` + exec 形式 ENTRYPOINT，是优雅停机与避免僵尸进程的最低成本保障。
2. **资源限制显式声明**：`--memory` + `--cpus` 必须显式设置，Java 应用配合 `MaxRAMPercentage`，避免 OOM 不可预测。
3. **日志轮转必须配置**：daemon.json 全局 `max-size` + `max-file`，否则 json-file 必然撑爆磁盘。
4. **重启策略区分 always 与 unless-stopped**：daemon 重启后的拉起行为不同，生产服务用 always，需尊重手动 stop 的场景用 unless-stopped。

理解容器=进程 + 隔离 + 资源限制的本质，所有生命周期操作都是对这一组进程的管理，命令背后的 Cgroups、Namespace、信号机制才是排查问题的根。
