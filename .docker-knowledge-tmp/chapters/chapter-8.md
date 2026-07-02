## 第8章 Docker Compose 多服务编排

### 核心知识点

> Compose 用一个 YAML 文件把"多容器应用"声明式地描述清楚——服务、网络、卷、依赖、健康检查、环境变量一次性定义，再以一条 `docker compose up` 拉起整个栈。它本质是"单机编排器"：不解决跨节点调度、不替代 K8s，但在本地开发、CI、小规模生产、Demo 部署中是事实标准。截至 2026 年，Compose v2（Go 实现，`docker compose` 子命令）已是主线，v1（Python `docker-compose`）已停止维护，掌握 v2 的 `depends_on` 条件等待、`profiles`、override 合并规则、变量插值与多文件机制，是从"会写 compose 文件"到"能稳定编排生产级应用"的关键分水岭。

**1. Compose 是什么：声明式多容器应用定义**
- 概念解释：Compose 是 Docker 官方的"单机多容器应用编排工具"。开发者用一份 YAML 文件（默认 `compose.yaml` / `docker-compose.yml`）声明应用由哪些服务组成、它们如何互联、用哪些卷和网络，再通过 `docker compose` 子命令完成构建、启动、停止、销毁等全生命周期管理。其底层仍调用 Docker Engine 的容器/网络/卷 API，并未引入新的运行时。
- 核心作用：把"起一个应用 = N 条 `docker run` + 配网络 + 挂卷 + 设环境变量"的脚本式操作，收敛成可版本化、可复现的声明式配置；同时提供依赖编排、健康等待、批量扩缩、多环境覆盖等能力。
- 基本用法（最小可运行示例）：
  ```yaml
  # compose.yaml
  services:
    web:
      image: nginx:1.27-alpine
      ports:
        - "8080:80"
      volumes:
        - ./html:/usr/share/nginx/html:ro
      depends_on:
        - api
    api:
      image: node:20-alpine
      command: node server.js
      working_dir: /app
      volumes:
        - ./api:/app
      environment:
        NODE_ENV: production
  ```
  ```bash
  docker compose up -d        # 后台启动整个应用栈
  docker compose ps           # 查看服务状态
  docker compose logs -f web  # 跟踪 web 日志
  docker compose down         # 停止并删除容器/默认网络
  ```
- 注意事项：
  - Compose 是"单机"编排，跨主机调度需用 Swarm 或 Kubernetes；不要把 Compose 当生产集群调度器。
  - 默认项目名取自所在目录名（`COMPOSE_PROJECT_NAME` 可覆盖），同名项目共享网络/卷命名空间，容器名默认形如 `<project>-<service>-1`。
  - 一个 Compose 文件描述的是一个"应用（application）"，而不是一个"集群"。

**2. Compose v1（Python）vs v2（Go）区别**
- 概念解释：Compose v1 是独立的 Python 实现，命令为 `docker-compose`（带连字符，独立二进制）；v2 用 Go 重写，作为 Docker CLI 的插件集成，命令为 `docker compose`（带空格，子命令）。v2 在 2023 年转正为默认推荐版本，v1 已停止维护。
- 核心区别：
  | 维度 | v1 `docker-compose` | v2 `docker compose` |
  |------|---------------------|----------------------|
  | 实现语言 | Python | Go（单二进制，无 Python 依赖） |
  | 安装方式 | 独立二进制，需单独安装 | Docker CLI 插件，随 Docker Desktop / engine 一起分发 |
  | 命令形态 | `docker-compose up` | `docker compose up`（空格） |
  | 性能 | 启动慢、内存占用高 | 显著更快、更省内存 |
  | 与 Docker CLI 集成 | 松散 | 紧密（共享 context、buildx、凭证） |
  | 新特性支持 | 不再支持 | `--wait`、`--profile`、`watch`、`include`、`attach` 依赖、`restart: true` 等仅在 v2 |
  | Compose Specification | 部分支持 | 完整实现 |
- 迁移要点：把脚本里的 `docker-compose` 全局替换为 `docker compose`；v2 不再要求 `version:` 字段（写了会被忽略并警告）；`links`、`volumes_from` 等老语法虽兼容但不推荐。
- 注意事项：
  - 官方镜像 `docker/compose` 仍可用于 CI 中需要固定版本 v2 的场景。
  - v2 的 `--profile`、`--wait`、`compose watch` 等是 v1 完全没有的能力，老教程不会覆盖。

**3. compose.yaml 文件结构与核心顶级字段**
- 概念解释：Compose 文件的顶级字段固定为几个：`name`、`services`、`networks`、`volumes`、`configs`、`secrets`，以及 `include`、`extends` 等组合字段。`services` 是必填，其余可选。`version` 字段在 Compose Specification 中已废弃（写了只产生 warning）。
- 核心字段：
  ```yaml
  name: myapp              # 项目名，覆盖目录名推断；v2 推荐用法

  services:                # 必填：定义所有容器服务
    web:
      image: nginx:1.27

  networks:                # 自定义网络（不写则自动建默认网络）
    frontend:
      driver: bridge
    backend:
      driver: bridge
      internal: true       # 内部网络，不可出站

  volumes:                 # 命名卷（named volume），跨容器共享持久化数据
    dbdata:
      driver: local

  configs:                 # 非敏感配置（如 nginx.conf），以文件形式挂入容器
    nginx_conf:
      file: ./nginx.conf

  secrets:                 # 敏感数据（如 DB 密码），以临时文件挂入 /run/secrets
    db_password:
      file: ./db_password.txt
  ```
- 服务引用网络/卷/配置的写法：
  ```yaml
  services:
    web:
      image: nginx
      networks: [frontend]
      configs: [nginx_conf]
      secrets: [db_password]
    db:
      image: postgres:16
      networks: [backend]
      volumes:
        - dbdata:/var/lib/postgresql/data
  ```
- 注意事项：
  - `configs` 与 `secrets` 在单机 Compose 中均以普通文件挂载（`/run/secrets/<name>` 或自定义目标路径），`secrets` 语义上提示"勿入版本库/勿打日志"，并非加密。
  - 顶级 `networks`/`volumes` 是"声明"，服务里引用时是"使用"；声明时给的属性（如 `driver`、`labels`）作用于资源本身。
  - `name` 顶级字段是 v2 推荐写法，可避免因目录名带空格/特殊字符导致的项目名异常。

**4. 服务字段详解（最常用 13 个）**
- 概念解释：每个 service 是一个容器的声明，字段对应 `docker run` 的各类参数。下面是高频字段的最小化样例与语义。
- 字段一览（含示例）：
  ```yaml
  services:
    api:
      image: myapp:latest              # 直接使用镜像
      build:                           # 与 image 二选一或并用（build 优先构建，image 指定标签）
        context: ./api
        dockerfile: Dockerfile
        args:
          VERSION: 1.0
        target: production             # 多阶段构建指定目标 stage
      ports:
        - "8080:80"                    # 主机:容器
        - "127.0.0.1:9090:9090"        # 绑定到本机回环
      volumes:
        - ./src:/app/src               # bind mount（相对路径）
        - appdata:/app/data            # 命名卷
        - type: tmpfs                  # tmpfs 内存盘
          target: /tmp
      environment:
        NODE_ENV: production
        DB_HOST: db
      env_file:
        - .env                         # 从文件加载多个变量
      depends_on:
        db:
          condition: service_healthy   # 等 healthcheck 通过
        redis:
          condition: service_started
      networks: [backend, frontend]
      restart: unless-stopped          # no|always|on-failure|unless-stopped
      healthcheck:
        test: ["CMD", "curl", "-f", "http://localhost/health"]
        interval: 15s
        timeout: 5s
        retries: 5
        start_period: 30s
      command: ["node", "server.js"]   # 覆盖镜像 CMD
      entrypoint: ["/app/entry.sh"]    # 覆盖镜像 ENTRYPOINT
      working_dir: /app
      user: "1000:1000"
      profiles: ["dev"]                # 仅在 --profile dev 时启动
      deploy:                          # 单机下仅 resources/replicas 部分生效
        resources:
          limits:
            cpus: "1.0"
            memory: 512M
  ```
- 字段速查：
  - `image` vs `build`：只用 `image` 直接拉取；用 `build` 时可同时给 `image` 指定构建后标签。
  - `command` 覆盖 `CMD`，`entrypoint` 覆盖 `ENTRYPOINT`；二者均为数组形式时不会被 shell 解析。
  - `restart: unless-stopped` 是最常用的策略：崩溃自动拉起，但用户主动 `stop` 后不再自启。
  - `profiles` 字段让服务"默认不启动"，必须用 `--profile` 显式激活。
- 注意事项：
  - `env_file` 中的变量会出现在容器环境里，但不会进行 `${VAR}` 插值到 compose 文件本身；插值发生在"compose 文件解析阶段"，`env_file` 发生在"容器运行阶段"，二者不是一回事。
  - `deploy` 在单机 Compose 中大部分字段（如 `placement`、`update_config`）被忽略，只有 `resources.limits`、`replicas`（配合 `--scale`）等少量字段生效。生产调度要用 Swarm/K8s。
  - `ports` 短语法 `"8080:80"` 会绑定到 `0.0.0.0`，公网可达；要限本机访问必须用长语法或显式写 `127.0.0.1:8080:80`。

**5. depends_on 与 healthcheck 配合实现就绪等待（重点讲透）**
- 概念解释：`depends_on` 控制启动/停止顺序，但 v1 时代只能等"容器 running"，不等"服务就绪"。v2 引入 `condition`，可声明三种等待条件：`service_started`（默认，等容器进入 running）、`service_healthy`（等 healthcheck 变 healthy）、`service_completed_successfully`（等一次性任务成功退出）。这是 Compose 解决"DB 还没起好 App 就连不上"问题的官方答案。
- 三种 condition 语义：
  - `service_started`：依赖容器进程已启动（进入 running 状态），但不保证能接受连接。最弱保证。
  - `service_healthy`：依赖容器配置了 `healthcheck` 且状态转为 `healthy`。最强保证，但要依赖镜像有可用探针命令。
  - `service_completed_successfully`：依赖容器以 exit code 0 退出，常用于"先跑迁移再起 App"的初始化任务。
- 完整示例（Web 等 Postgres 就绪后再起，并配置 `restart: true` 在依赖重启时联动）：
  ```yaml
  services:
    web:
      build: .
      depends_on:
        db:
          condition: service_healthy
          restart: true          # v2 新增：db 重启时自动重启 web
        redis:
          condition: service_started
      environment:
        DATABASE_URL: postgres://user:pass@db:5432/app
    db:
      image: postgres:16
      environment:
        POSTGRES_USER: user
        POSTGRES_PASSWORD: pass
        POSTGRES_DB: app
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U user -d app"]
        interval: 10s
        timeout: 5s
        retries: 5
        start_period: 30s        # 启动初期不计数，避免误判
      volumes:
        - dbdata:/var/lib/postgresql/data
    redis:
      image: redis:7-alpine
  volumes:
    dbdata:
  ```
- "先迁移再起 App"模式（一次性任务）：
  ```yaml
  services:
    migrate:
      image: myapp:latest
      command: ["./migrate.sh"]
      depends_on:
        db:
          condition: service_healthy
      restart: "no"
    api:
      image: myapp:latest
      depends_on:
        migrate:
          condition: service_completed_successfully
        db:
          condition: service_healthy
  ```
- 注意事项：
  - `healthcheck` 是 `service_healthy` 的前提，没配 healthcheck 而写 `condition: service_healthy` 会一直阻塞直至超时。
  - `start_period` 很关键：JVM/PG 等慢启动服务在 `start_period` 内的失败不计入 retries，可避免冷启动被误判为 unhealthy。
  - `depends_on` 只解决"启动顺序与就绪等待"，**不解决运行时依赖失效**——DB 崩了 App 不会自动重启，除非配 `restart: true`（v2）或 `restart: unless-stopped`。
  - `condition: service_completed_successfully` 要求依赖容器是"跑完就退出"的任务型服务，不能用于常驻服务。
  - 旧式 `depends_on: [db, redis]` 短语法等价于全部 `service_started`，已不推荐用于有就绪依赖的场景。

**6. profiles：按环境/角色启用服务子集**
- 概念解释：`profiles` 让"调试工具/监控/一次性任务"等服务在默认 `docker compose up` 时**不启动**，仅在指定 `--profile` 时激活。一份文件管理多套角色，避免拆分多个 compose 文件。无 `profiles` 字段的服务始终启用（核心服务应如此）。
- 核心规则（来自官方文档）：
  - 未声明 `profiles` 的服务**总是启用**，任何 `up` 都会启动它们。
  - 声明了 `profiles` 的服务仅在对应 profile 被激活时启动。
  - 显式在命令行指明某个服务（如 `docker compose run db-migrations`）时，会自动激活该服务所属 profile，无需手动 `--profile`。
  - 多个 profile 可同时启用：`--profile a --profile b` 或 `COMPOSE_PROFILES=a,b`。
- 示例（一份文件覆盖开发/调试/迁移三种角色）：
  ```yaml
  services:
    api:
      image: myapp:latest               # 核心，无 profiles，永远启用
      depends_on: [db]
    db:
      image: postgres:16                # 核心，永远启用

    adminer:                            # 调试工具，仅 debug profile
      image: adminer
      ports: ["8080:8080"]
      profiles: ["debug"]

    db-migrations:                      # 一次性任务，仅 tools profile
      image: myapp:latest
      command: ["./migrate.sh"]
      depends_on:
        db:
          condition: service_healthy
      profiles: ["tools"]

    mailhog:                            # 开发用邮件捕获
      image: mailhog/mailhog
      profiles: ["dev", "debug"]        # 多 profile 共享
  ```
  ```bash
  docker compose up -d                            # 仅起 api + db
  docker compose --profile debug up -d            # 起 api + db + adminer + mailhog
  docker compose --profile dev --profile debug up # 启用两个 profile
  docker compose run db-migrations                # 自动激活 tools，跑一次性迁移
  COMPOSE_PROFILES=debug docker compose up        # 通过环境变量启用
  ```
- 注意事项：
  - profile 名正则为 `[a-zA-Z0-9][a-zA-Z0-9_.-]+`，不能以点/横线开头。
  - `docker compose down` 不带 `--profile` 时**只删无 profile 的服务**；带 `--profile debug down` 才会一并清理 debug 服务。这是常见清理残留坑。
  - 若一个有 profile 的服务被无 profile 的服务 `depends_on`，会破坏 profile 语义（依赖永远要被启动），应避免这种交叉。

**7. compose 命令体系与 up 关键参数**
- 概念解释：`docker compose` 子命令族覆盖应用全生命周期。最核心是 `up`（创建并启动），其次是 `down`/`ps`/`logs`/`exec`/`build`/`pull`/`restart`/`top`/`config`。
- 命令速查：
  ```bash
  docker compose up -d                 # 创建+启动，后台运行
  docker compose up --build            # 启动前强制重新构建镜像
  docker compose up --force-recreate   # 强制重建容器（即使配置未变）
  docker compose up --scale web=3      # 水平扩展 web 为 3 副本
  docker compose up --wait             # 阻塞直至所有服务 healthy 才返回（CI 神器）
  docker compose up --no-deps web      # 仅启动 web，不动其依赖
  docker compose down                  # 停止+删除容器+默认网络（保留卷）
  docker compose down -v               # 一并删除命名卷
  docker compose down --rmi local      # 删除本次构建的镜像
  docker compose ps                    # 列出本项目容器
  docker compose ps --services         # 仅列服务名
  docker compose logs -f --tail=200 web
  docker compose exec web sh           # 进入运行中容器
  docker compose run --rm web npm test # 一次性运行（建新容器），--rm 退出即删
  docker compose build                 # 构建所有 build: 服务
  docker compose pull                  # 拉取所有 image: 服务镜像
  docker compose restart web           # 重启某服务（不重建）
  docker compose top                   # 查看各容器内进程
  docker compose config                # 解析并打印合并后的最终配置（含变量插值结果）
  docker compose images                # 列出服务所用镜像
  ```
- `up` 关键参数详解：
  - `-d, --detach`：后台运行，不占终端。CI 中要谨慎，配合 `--wait` 才能拿到就绪信号。
  - `--build`：每次 up 都重新构建镜像，避免使用旧镜像层。CI 推荐必加。
  - `--force-recreate`：即使配置未变也重建容器，用于强制刷新某些状态。
  - `--rebuild`（v2 较新版本）：更激进的重建策略。
  - `--scale SERVICE=NUM`：覆盖某服务副本数。注意端口冲突（见陷阱章节）。
  - `--wait`：阻塞直至所有服务 `running` 且（若有）`healthy` 才返回 0；任一失败则返回非 0。CI 测试栈首选。
  - `--no-deps`：跳过依赖，单独操作某服务。
  - `--remove-orphans`：清理 compose 文件中已不存在但仍在运行的旧容器。
- 注意事项：
  - `docker compose run` 与 `docker compose up` 不同：`run` 创建一个**新**容器执行一次性命令，不复用 `up` 起的容器；常用于跑测试、迁移。
  - `docker compose config` 是排查"为什么我的配置没生效"的终极武器——它会打印变量插值、override 合并后的最终 YAML。
  - `down` 默认不删卷（保护数据），生产环境慎用 `-v`。

**8. 环境变量、.env 文件与变量插值**
- 概念解释：Compose 中存在两层"环境变量"概念，务必分清：
  1. **变量插值（interpolation）**：解析 compose 文件时，把 `${VAR}` 替换成实际值。来源优先级：shell 环境变量 > `.env` 文件 > 默认值 `${VAR:-default}`。这发生在文件被解析阶段。
  2. **容器环境变量（container env）**：通过 `environment` / `env_file` 注入到容器进程内，与插值无关。
- `.env` 文件机制：
  - 默认从执行 `docker compose` 的**当前目录**读取 `.env`（不是 compose 文件所在目录）。
  - 仅用于插值，不会自动注入容器；要让变量进入容器需显式 `env_file: [.env]` 或 `environment:`。
  - 可用 `--env-file ./config/.env` 指定其他文件。
- 插值语法（来自官方 spec）：
  ```yaml
  services:
    db:
      image: postgres:${POSTGRES_VERSION:-16}   # 未设置时用 16
      environment:
        POSTGRES_PASSWORD: ${DB_PASSWORD:?required}  # 未设置则报错中止
  ```
  - `${VAR}`、`${VAR:-default}`（未设置或为空用默认）、`${VAR-default}`（仅未设置用默认）、`${VAR:?err}`（未设置则报错）、`${VAR?err}`（未设置或空则报错）。
- 完整示例（含 `.env`）：
  ```bash
  # .env（与 compose.yaml 同目录）
  POSTGRES_VERSION=16
  DB_PASSWORD=s3cret
  APP_PORT=8080
  ```
  ```yaml
  # compose.yaml
  services:
    db:
      image: postgres:${POSTGRES_VERSION:-16}
      environment:
        POSTGRES_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD is required}
    web:
      image: myapp:latest
      ports:
        - "${APP_PORT}:80"
      env_file:
        - .env                          # 把 .env 内容也注入容器
  ```
- 注意事项：
  - **`$$` 才是字面美元符号**：compose 文件里写 `$$VAR` 会被原样传给容器（不插值），常用于 healthcheck 中需要 shell 解析变量的命令。例如 `pg_isready -U $${POSTGRES_USER}`，单 `$` 会被 compose 先插值掉。
  - shell 中已 export 的同名变量优先级高于 `.env` 文件，CI 里常因预置变量导致 `.env` "不生效"。
  - `.env` 文件位置是当前工作目录而非 compose 文件目录，跨目录运行时易出错。

**9. override 机制、多文件与多环境管理**
- 概念解释：Compose 提供三种"组合多个文件"的机制，叠加 `--profile` 共同支撑多环境管理：
  1. **自动 override**：默认会自动加载 `docker-compose.override.yml`（与主文件同名但加 `.override`）并合并。
  2. **手动 `-f` 多文件**：显式指定多个文件按顺序合并，前者为基础、后者覆盖。
  3. **`extends` / `include`**：在文件内引用其他文件的部分服务，更结构化复用。
- 自动 override 行为：
  - `docker compose up` 默认查找顺序：`compose.yaml` > `compose.yml` > `docker-compose.yaml` > `docker-compose.yml`，并自动追加同名 `.override` 文件。
  - 典型用途：`docker-compose.yml` 放生产基础配置，`docker-compose.override.yml` 放开发覆盖（如挂源码、开调试端口）。
- 合并规则要点：
  - **单值字段**（如 `image`、`command`、`memory`）：后者整体覆盖前者。
  - **多值/列表字段**（如 `ports`、`volumes`、`networks`）：v2 默认**追加**（去重），不是覆盖；但 `environment`/`labels` 这类 map 类型按 key 合并覆盖。
  - 这套规则复杂，正式生产建议用 `docker compose config` 验证合并结果。
- 多文件示例（dev/prod 分离）：
  ```yaml
  # compose.yaml —— 基础配置
  services:
    web:
      image: myapp:latest
      depends_on: [db]
    db:
      image: postgres:16
      volumes: [dbdata:/var/lib/postgresql/data]
  volumes:
    dbdata:
  ```
  ```yaml
  # compose.dev.yml —— 开发覆盖
  services:
    web:
      build: ./web                       # 开发用本地构建
      volumes:
        - ./web/src:/app/src             # 热重载
      environment:
        NODE_ENV: development
      ports:
        - "8080:80"
        - "9229:9229"                    # 调试端口
  ```
  ```yaml
  # compose.prod.yml —— 生产覆盖
  services:
    web:
      image: registry.example.com/myapp:${TAG}
      restart: unless-stopped
      environment:
        NODE_ENV: production
      ports:
        - "80:80"
  ```
  ```bash
  docker compose -f compose.yaml -f compose.dev.yml up -d
  docker compose -f compose.yaml -f compose.prod.yml up -d
  # 简化：用 --profile 或 COMPOSE_FILE 环境变量
  COMPOSE_FILE=compose.yaml:compose.prod.yml docker compose up -d
  ```
- `extends` 复用（在同一文件或跨文件复用单个服务定义）：
  ```yaml
  services:
    web:
      extends:
        file: compose.base.yaml
        service: webapp
      environment:
        ENV: override
  ```
- `include`（v2 新增，引入整个文件）：
  ```yaml
  include:
    - compose.monitoring.yaml
    - compose.logging.yaml
  services:
    web:
      image: myapp:latest
  ```
- 注意事项：
  - 自动 override 是双刃剑：开发爽，生产危险。生产环境务必用 `-f` 显式指定文件，并在 CI 用 `docker compose config` 校验。
  - `extends` 复用单个服务定义，`include` 引入整文件，`-f` 全文件叠加——三者粒度递增，按需选择。
  - 老版本 `extends` 在 v3 曾被废弃，但 Compose Specification 重新支持；v2 完整可用。

**10. YAML 锚点、extension fields 与 extends 复用**
- 概念解释：除 Compose 提供的 `extends`/`include` 外，YAML 原生的"锚点 `&` / 别名 `*` / 合并键 `<<`"也能在文件内复用片段；Compose 还支持 `x-` 前缀的自定义扩展字段（如 `x-common-env`），便于组织大型配置。
- YAML 锚点示例：
  ```yaml
  x-common-env: &common-env            # 定义锚点
    TZ: Asia/Shanghai
    LOG_LEVEL: info

  services:
    api:
      image: myapp:latest
      environment:
        <<: *common-env                 # 合并锚点内容
        SERVICE_ROLE: api
    worker:
      image: myapp:latest
      environment:
        <<: *common-env
        SERVICE_ROLE: worker
  ```
- 注意事项：
  - 锚点是纯 YAML 特性，`docker compose config` 会展开为最终值；调试时用它可看清合并结果。
  - `x-` 字段是 Compose 规范允许的"用户自定义顶级字段"，不会被解释为服务，常用来存放复用片段。
  - 跨文件复用优先用 `extends`/`include`，文件内复用优先用锚点。

**11. Compose 与 Swarm / Kubernetes 的关系**
- 概念解释：三者都基于"声明式"思想（YAML 描述期望状态，控制器驱动到该状态），但定位不同：
  - **Compose**：单机编排，开发/CI/小规模生产，无调度器、无自愈、无滚动升级。
  - **Swarm**：Docker 内置的多机集群模式，`docker stack deploy` 可直接吃 Compose 文件（部分字段），但社区活跃度低，2026 年已基本退出主流。
  - **Kubernetes**：跨机集群编排的事实标准，提供调度、自愈、滚动升级、HPA、Service Mesh 等生产级能力。
- 关系要点：
  - Compose 文件无法直接 `kubectl apply`，需用工具转换：`kompose convert`（社区）、`docker compose bridge`（Docker 官方 2024+ 推出，把 compose.yaml 转成 K8s manifests/Helm chart）。
  - Compose 的 `deploy` 字段（`replicas`、`update_config`、`placement` 等）在单机模式大多被忽略，在 Swarm 模式才生效。
  - "声明式 + 期望状态"的思维方式从 Compose 平滑迁移到 K8s，但 K8s 的 Pod/Service/Deployment/Ingress 模型与 Compose 的 service 模型差异较大。
- 注意事项：
  - 不要把 Compose 当生产集群调度器；生产用 K8s 或 Swarm。
  - 学习 K8s 前，把 Compose 学透能极大降低"声明式思维"的门槛。

---

### 章节题目

#### 【面试题】

**Q1（面试题·高频）**：`depends_on` 能保证服务"就绪"吗？为什么还需要 `healthcheck`？请说明 v2 中如何让 Web 服务等到 Postgres 真正能接受连接后再启动。
- 答案：不能。`depends_on` 的短语法（`depends_on: [db]`）仅保证依赖容器进入 `running` 状态，不等同于"服务就绪"——Postgres 进程启动后仍需数秒初始化才能接受连接。v2 必须用长语法 + `condition: service_healthy`，并在依赖服务上配置 `healthcheck`：
  ```yaml
  services:
    web:
      depends_on:
        db:
          condition: service_healthy
          restart: true
    db:
      image: postgres:16
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER"]
        interval: 10s
        retries: 5
        start_period: 30s
  ```
  `start_period` 给慢启动留缓冲，`restart: true` 让 db 重启时联动重启 web。
- 考点：depends_on 三种 condition、healthcheck 必要性、v2 的 restart: true 联动；属于"就绪等待"核心知识，几乎必考。
- 难度：⭐⭐⭐

**Q2（面试题）**：`docker-compose`（带连字符）和 `docker compose`（带空格）有什么区别？生产应该用哪个？为什么？
- 答案：前者是 Compose v1，独立的 Python 实现二进制；后者是 Compose v2，作为 Docker CLI 插件用 Go 编写。v2 是当前推荐版本：性能更好（无 Python 依赖、启动更快）、与 Docker CLI 集成更紧密（共享 context、buildx）、支持 `--wait`/`--profile`/`watch`/`include` 等 v1 没有的新特性，且 v1 已停止维护。生产应统一用 `docker compose`，并在 CI 中固定 v2 版本（如 `docker/compose:v2.x` 镜像）。
- 考点：v1/v2 实现差异、版本生命周期、新特性归属。
- 难度：⭐⭐

**Q3（面试题·进阶）**：解释 Compose 中 `extends`、`include`、`-f` 多文件三种复用机制的差异，何时选哪个？
- 答案：
  - `-f` 多文件：全文件叠加合并，按合并规则覆盖/追加。适合 dev/prod 这种"整体环境覆盖"。
  - `extends`：在文件内引用另一个文件的**单个服务**定义并可局部覆盖。适合"复用一个服务模板，做小调整"。
  - `include`（v2）：在文件顶部引入整个文件，所有服务/网络/卷并入当前项目。适合"主应用 + 监控/日志子栈"组合。
  - 选择原则：整体环境差异用 `-f`；单服务模板复用用 `extends`；多个独立子栈组合用 `include`。
- 考点：三种组合机制粒度与适用场景。
- 难度：⭐⭐⭐⭐

#### 【论坛题】

**Q4（论坛题·Stack Overflow 高频）**：来源：Stack Overflow 多个高票问题（如"docker-compose.override.yml is loaded unexpectedly"）。问题：我没有写 `-f docker-compose.override.yml`，为什么它还是被加载了？怎么关掉？
- 答案：Compose v1/v2 默认会自动加载与主文件同目录、同名的 `.override` 文件（`docker-compose.override.yml` / `compose.override.yaml` 等）。这是"开发覆盖生产"的便利特性，但生产环境常带来意外覆盖。关闭方法：
  1. 显式指定文件：`docker compose -f compose.yaml -f compose.prod.yml up`，不写 override 它就不会自动加载（显式 `-f` 时自动 override 行为被禁用）。
  2. 删除/重命名 override 文件。
  3. 用 `COMPOSE_FILE` 环境变量显式声明文件列表。
  排查时用 `docker compose config` 看实际合并后的配置，能立刻发现哪些字段被 override 了。
- 考点：override 自动加载机制、关闭方法、config 排查。
- 难度：⭐⭐⭐

**Q5（论坛题·GitHub Issues / Reddit）**：来源：compose 仓库 issue 与 r/docker 高频帖。问题：我在 `.env` 里设了 `DB_PASSWORD`，但 `docker compose up` 报 `DB_PASSWORD is required`（用了 `${DB_PASSWORD:?required}`），为什么 `.env` 没生效？
- 答案：常见原因有三种：
  1. **运行目录不对**：`.env` 必须在执行 `docker compose` 的**当前工作目录**下，而非 compose 文件所在目录。用 `cd` 切到错误目录运行会找不到 `.env`。
  2. **shell 环境变量优先级更高**：如果 shell 已 export 了空的 `DB_PASSWORD=`，会覆盖 `.env` 中的值。检查 `env | grep DB_PASSWORD`。
  3. **`env_file` 与插值混淆**：`env_file: [.env]` 是把变量注入容器，**不**用于 compose 文件插值。插值只用 shell + `.env`。
  排查：`docker compose config` 会显示插值后的最终值；用 `--env-file ./path/.env` 显式指定路径；shell 变量用 `unset DB_PASSWORD` 清掉。
- 考点：.env 文件位置、变量优先级、插值与 env_file 区别。
- 难度：⭐⭐⭐

#### 【期末题/认证题】

**Q6（期末题·单选）**：下列关于 Compose 文件顶级字段的描述，正确的是：
A. `version` 字段在 Compose v2 中是必填的
B. `configs` 和 `secrets` 在单机 Compose 中无法使用，只能在 Swarm 中用
C. `name` 顶级字段用于显式指定项目名，可覆盖目录名推断
D. 一个 compose 文件必须同时声明 `services`、`networks`、`volumes` 三者
- 答案：C。`version` 在 v2 已废弃（A 错）；`configs`/`secrets` 在单机以普通文件挂载，可用（B 错）；只有 `services` 必填，`networks`/`volumes` 可选（D 错）。`name` 是 v2 推荐写法，用于稳定项目名。
- 考点：顶级字段语义、version 废弃、configs/secrets 单机可用性。
- 难度：⭐⭐

**Q7（认证题·多选）**：以下哪些是 `docker compose up` 的合法参数且能影响容器行为？
A. `--build`  B. `--force-recreate`  C. `--scale web=3`  D. `--wait`  E. `--no-cache`
- 答案：A、B、C、D、E 均合法。`--build` 启动前重新构建；`--force-recreate` 强制重建容器；`--scale web=3` 扩展副本；`--wait` 阻塞至所有服务 healthy；`--no-cache` 构建时不使用缓存（实际是 `build --no-cache` 联动）。注意 `--scale` 多副本时若服务静态映射端口会冲突。
- 考点：up 参数体系。
- 难度：⭐⭐⭐

**Q8（期末题·判断）**：`depends_on` 中的 `condition: service_completed_successfully` 适用于常驻服务（如 Web 服务器）。
- 答案：错。`service_completed_successfully` 要求依赖容器以 exit code 0 退出，适用于一次性任务（如数据库迁移、初始化脚本）。常驻服务不会"成功退出"，用它会导致依赖方永远等不到，最终超时失败。常驻服务应用 `service_started` 或 `service_healthy`。
- 考点：三种 condition 的适用对象。
- 难度：⭐⭐

#### 【官网题】

**Q9（官网题·来自 Compose reference profiles 文档）**：根据官方文档，下列配置执行 `docker compose up` 时会启动哪些服务？
  ```yaml
  services:
    frontend:
      image: frontend
      profiles: [frontend]
    phpmyadmin:
      image: phpmyadmin
      depends_on: [db]
      profiles: [debug]
    backend:
      image: backend
    db:
      image: mysql
  ```
- 答案：仅启动 `backend` 和 `db`。无 `profiles` 字段的服务始终启用；`frontend`、`phpmyadmin` 因声明了 profile 而默认不启动。要启动 phpmyadmin 需 `docker compose --profile debug up`（此时 backend、db、phpmyadmin 都启动）。注意：若改执行 `docker compose run phpmyadmin`，会自动激活 debug profile 并连带启动其依赖 db。
- 考点：profiles 默认行为、显式 run 自动激活 profile。
- 来源：https://docs.docker.com/compose/how-tos/profiles/
- 难度：⭐⭐⭐

**Q10（官网题·来自 startup-order 文档）**：官方推荐的"控制启动顺序"方案中，`depends_on` 的 `condition` 有哪三个取值？`restart: true` 起什么作用？
- 答案：三个取值为 `service_started`（默认，仅等容器 running）、`service_healthy`（等 healthcheck 转为 healthy）、`service_completed_successfully`（等依赖容器以 exit 0 退出，用于一次性任务）。`restart: true` 是 v2 新增：当依赖服务因显式 Compose 操作（如 `docker compose restart db`）被重启时，自动重启声明了该依赖的服务，确保重新建立连接。
- 来源：https://docs.docker.com/compose/how-tos/startup-order/
- 难度：⭐⭐⭐

#### 【实战题】

**Q11（实战题）**：请用一份 `compose.yaml` 编排一个 Web 应用 + Postgres + Redis 三服务栈，要求：
- Web 在 Postgres 健康后才启动，并使用 `restart: true` 联动；
- Redis 仅需 started；
- Postgres 数据持久化到命名卷；
- 通过 `.env` 注入数据库密码，未设置时报错中止；
- 暴露 Web 到主机 8080 端口。
- 答案：
  ```bash
  # .env
  POSTGRES_PASSWORD=change_me
  ```
  ```yaml
  # compose.yaml
  name: webstack
  services:
    web:
      build: ./web
      ports:
        - "8080:80"
      environment:
        DATABASE_URL: postgres://app:${POSTGRES_PASSWORD}@db:5432/app
        REDIS_URL: redis://redis:6379
      depends_on:
        db:
          condition: service_healthy
          restart: true
        redis:
          condition: service_started
      restart: unless-stopped
    db:
      image: postgres:16
      environment:
        POSTGRES_USER: app
        POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
        POSTGRES_DB: app
      volumes:
        - dbdata:/var/lib/postgresql/data
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U app -d app"]
        interval: 10s
        timeout: 5s
        retries: 5
        start_period: 30s
      restart: unless-stopped
    redis:
      image: redis:7-alpine
      restart: unless-stopped
  volumes:
    dbdata:
  ```
- 考点：depends_on + healthcheck、restart: true、命名卷、.env 插值与 `:?` 校验、ports 暴露。
- 难度：⭐⭐⭐⭐

**Q12（实战题·CI 场景）**：在 CI 中需要：用 compose 起一个测试栈（app + db），等所有服务就绪后跑 `npm test`，并把测试退出码作为 CI 通过条件。如何实现？
- 答案：用 `--wait` + `--build` 起栈，再 `exec`/`run` 跑测试，最后 `down` 清理。关键是用 `--exit-code-from` 让 compose 返回测试服务的退出码：
  ```yaml
  # compose.test.yaml
  services:
    app:
      build: .
      depends_on:
        db:
          condition: service_healthy
      environment:
        DATABASE_URL: postgres://app:pass@db:5432/app
    db:
      image: postgres:16
      environment:
        POSTGRES_USER: app
        POSTGRES_PASSWORD: pass
        POSTGRES_DB: app
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U app"]
        interval: 5s
        retries: 10
    test:
      build: .
      depends_on:
        app:
          condition: service_started
      command: ["npm", "test"]
      profiles: ["ci"]
  ```
  ```bash
  docker compose -f compose.test.yaml up -d --build --wait db app
  docker compose -f compose.test.yaml run --rm test
  TEST_EXIT=$?
  docker compose -f compose.test.yaml down -v
  exit $TEST_EXIT
  ```
  或更简洁地用 `--exit-code-from test`：
  ```bash
  docker compose -f compose.test.yaml --profile ci up --build --exit-code-from test
  ```
  `--wait` 确保依赖就绪，`--exit-code-from test` 让 compose 透传 test 服务退出码。
- 考点：--wait、--build、--exit-code-from、profiles 隔离测试服务、CI 清理。
- 难度：⭐⭐⭐⭐⭐

**Q13（实战题·水平扩展）**：你想用 `docker compose up --scale worker=3` 起三个 worker 副本做并行消费，但运行报错端口冲突。原因和解决方案？
- 答案：worker 服务若静态映射端口（如 `ports: ["8080:80"]`），三副本都试图占用主机 8080，必然冲突。解决：
  1. **取消 `ports`**：worker 是内部消费服务，无需暴露主机端口，仅靠 compose 内部网络互联即可。
  2. **用端口范围**：`ports: ["8080-8082:80"]`，compose 自动分配范围内端口。
  3. **不映射主机端口**：仅 `expose: ["80"]`，只在 compose 网络内可见。
  注意 `--scale` 后服务名解析仍为单一 DNS 名（如 `worker`），compose 会做内部负载均衡（v2 支持），但具体策略有限，生产水平扩展建议用 K8s。
- 考点：--scale 与静态端口冲突、内部网络 vs 端口映射。
- 难度：⭐⭐⭐⭐

---

### 项目常用场景

**场景1：本地开发环境（hot reload + DB）**
- 背景：前后端分离项目，前端 Vite 开发服务器 + 后端 Node API + Postgres + Redis，要求改代码即时热重载，DB 数据本地持久化，一键起停。
- 解决方案：
  ```yaml
  # compose.yaml
  name: devstack
  services:
    frontend:
      image: node:20-alpine
      working_dir: /app
      command: ["npm", "run", "dev", "--", "--host"]
      volumes:
        - ./frontend:/app
        - /app/node_modules            # 匿名卷隔离 node_modules，避免被宿主覆盖
      ports:
        - "5173:5173"
      environment:
        VITE_API_URL: http://localhost:3000
    api:
      image: node:20-alpine
      working_dir: /app
      command: ["npm", "run", "dev"]
      volumes:
        - ./api:/app
        - /app/node_modules
      ports:
        - "3000:3000"
      environment:
        DATABASE_URL: postgres://app:pass@db:5432/app
        REDIS_URL: redis://redis:6379
      depends_on:
        db:
          condition: service_healthy
        redis:
          condition: service_started
    db:
      image: postgres:16
      environment:
        POSTGRES_USER: app
        POSTGRES_PASSWORD: pass
        POSTGRES_DB: app
      volumes:
        - dbdata:/var/lib/postgresql/data
      ports:
        - "5432:5432"                  # 开发期暴露方便用 GUI 工具连
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U app"]
        interval: 5s
        retries: 10
    redis:
      image: redis:7-alpine
      ports: ["6379:6379"]
    adminer:
      image: adminer
      ports: ["8080:8080"]
      profiles: ["debug"]              # 仅调试时启用
  volumes:
    dbdata:
  ```
- 最佳实践：
  - 用 `/app/node_modules` 匿名卷防止宿主（可能没有该目录）覆盖容器内的依赖。
  - `depends_on: service_healthy` 保证 API 等 DB 就绪。
  - 调试工具（adminer）放 `profiles: [debug]`，平时不起。
  - 用 `docker compose watch`（v2）可监听文件变化自动同步，比手动 volume 挂载更精细。

**场景2：多环境 dev/prod 配置（base + override）**
- 背景：同一份应用配置需在开发、测试、生产三环境运行，差异主要在镜像来源、端口、资源限制、日志驱动、是否挂源码。
- 解决方案：基础文件 + 两个 override 文件，用 `-f` 显式组合。
  ```yaml
  # compose.yaml —— 基础
  name: myapp
  services:
    web:
      image: myapp:latest              # 占位，由 override 覆盖
      depends_on:
        db:
          condition: service_healthy
      env_file: [.env]
    db:
      image: postgres:16
      volumes: [dbdata:/var/lib/postgresql/data]
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U app"]
        interval: 10s
        retries: 5
  volumes:
    dbdata:
  ```
  ```yaml
  # compose.dev.yml
  services:
    web:
      build: ./web
      image: myapp:dev
      volumes:
        - ./web/src:/app/src
      ports: ["8080:80"]
      environment:
        NODE_ENV: development
  ```
  ```yaml
  # compose.prod.yml
  services:
    web:
      image: registry.example.com/myapp:${TAG:?TAG required}
      restart: unless-stopped
      ports: ["80:80"]
      environment:
        NODE_ENV: production
      deploy:
        resources:
          limits:
            cpus: "1.0"
            memory: 512M
      logging:
        driver: json-file
        options:
          max-size: "10m"
          max-file: "3"
    db:
      restart: unless-stopped
      logging:
        driver: json-file
        options:
          max-size: "10m"
          max-file: "5"
  ```
  ```bash
  # 开发
  docker compose -f compose.yaml -f compose.dev.yml up -d
  # 生产
  TAG=v1.2.3 docker compose -f compose.yaml -f compose.prod.yml up -d
  # 简化：用 COMPOSE_FILE
  export COMPOSE_FILE=compose.yaml:compose.prod.yml
  docker compose up -d
  ```
- 最佳实践：
  - 生产用 `-f` 显式指定，避免自动 override 干扰。
  - 用 `${TAG:?...}` 强制生产镜像标签，防止误用 `latest`。
  - 生产务必配 `logging` 限制日志大小，否则 json-file 驱动会撑爆磁盘。
  - 用 `docker compose config` 在 CI 校验合并结果。

**场景3：CI 中跑集成测试栈**
- 背景：CI 流水线要起 app + db + redis 测试栈，跑测试后清理，并把测试结果作为流水线通过条件。
- 解决方案：
  ```yaml
  # compose.ci.yaml
  services:
    app:
      build: .
      image: app:ci
      depends_on:
        db:
          condition: service_healthy
        redis:
          condition: service_started
      environment:
        DATABASE_URL: postgres://app:pass@db:5432/app
        REDIS_URL: redis://redis:6379
    db:
      image: postgres:16
      environment:
        POSTGRES_USER: app
        POSTGRES_PASSWORD: pass
        POSTGRES_DB: app
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U app"]
        interval: 5s
        retries: 20
    redis:
      image: redis:7-alpine
    test:
      image: app:ci
      depends_on:
        app:
          condition: service_started
      command: ["npm", "test"]
      profiles: ["ci"]
  ```
  ```bash
  set -e
  docker compose -f compose.ci.yaml up -d --build --wait db redis app
  docker compose -f compose.ci.yaml run --rm test
  # 或一行版（更推荐）：
  docker compose -f compose.ci.yaml --profile ci up --build --exit-code-from test
  docker compose -f compose.ci.yaml down -v
  ```
- 最佳实践：
  - `--wait` 保证依赖就绪，避免测试连接 DB 失败的偶发问题。
  - `--exit-code-from test` 透传测试退出码，CI 据此判断成败。
  - 用 `profiles: [ci]` 隔离 test 服务，避免误启动。
  - `down -v` 清理测试数据卷，防止 CI 残留。
  - 测试服务复用 `app:ci` 镜像避免重复构建。

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|----------|----------|
| `depends_on` 短语法 `[db]` | `depends_on` 长语法 `condition: service_healthy` | 短语法仅等依赖容器 `running`（不等就绪）；长语法可等 `service_healthy`/`service_completed_successfully` | 短语法用于无连接依赖（如共享配置）；长语法用于 DB/缓存等需就绪的服务 |
| v1 `docker-compose`（连字符） | v2 `docker compose`（空格） | v1 是独立 Python 二进制已停维；v2 是 Go 实现的 Docker CLI 插件，性能更好、支持新特性 | 全部新项目用 v2；CI 中固定 v2 版本 |
| `build:` | `image:` | `build` 从 Dockerfile 构建；`image` 直接拉取镜像。可并用：`build` 构建 + `image` 指定标签 | 开发用 `build` 热迭代；生产用 `image` 拉注册表镜像；CI 用 `build` + `image` 打标签推送 |
| override 自动加载（`.override.yml`） | 手动 `-f` 多文件 | 自动加载无需指定但易意外覆盖；手动 `-f` 显式可控但需写全 | 开发用自动 override 便捷；生产用 `-f` 显式避免意外 |
| `env_file:` | `environment:` | `env_file` 从文件批量加载变量**注入容器**（不参与 compose 文件插值）；`environment` 直接列键值对注入容器 | `env_file` 适合大量变量/敏感配置；`environment` 适合少量关键变量 |
| `profiles` | 多文件 `-f` | `profiles` 在**同一文件**内按角色开关服务子集；多文件 `-f` 是**整体环境**叠加 | `profiles` 用于调试/工具/迁移等角色服务；多文件用于 dev/prod 等环境差异 |
| `extends` | `include` | `extends` 复用**单个服务**定义可局部覆盖；`include` 引入**整个文件**所有资源 | `extends` 用于服务模板复用；`include` 用于子栈组合（监控、日志） |
| 变量插值 `${VAR}` | 容器环境变量 | 插值发生在 compose 文件解析阶段（来源 shell + `.env`）；容器环境变量在容器运行时注入（来源 `environment`/`env_file`） | 插值用于参数化 compose 配置；容器环境变量用于应用读取运行时配置 |

---

### 常见陷阱与坑点

**陷阱1：`depends_on` 不等于"就绪"**
- 现象：App 启动报"connection refused"连不上 DB，明明配了 `depends_on: [db]`。
- 原因：短语法 `depends_on: [db]` 仅等 DB 容器进入 running，不等 PG 完成初始化能接受连接。容器"running" ≠ 服务"ready"。
- 解决方案：用长语法 `condition: service_healthy` + 在 db 上配 `healthcheck`（如 `pg_isready`），并设 `start_period` 容忍慢启动。
- 预防措施：任何"需要连接的依赖"都用 `service_healthy`，仅"无连接依赖"用 `service_started`；一次性任务用 `service_completed_successfully`。

**陷阱2：命名卷自动加项目前缀**
- 现象：在 A 项目和 B 项目都声明 `volumes: [dbdata:]`，期望共享数据，但实际各起一个卷 `a_dbdata` / `b_dbdata`，互不相通。
- 原因：Compose 会给所有命名卷加项目名前缀（默认目录名），保证不同项目隔离。容器名、网络名同理（`<project>_<service>_1`）。
- 解决方案：要跨项目共享，必须用 `name:` 显式声明卷的"真名"绕过前缀：
  ```yaml
  volumes:
    dbdata:
      name: shared_dbdata         # 不再加项目前缀，多项目可共用
      external: true              # 配合 external 表示卷已存在，compose 不创建
  ```
- 预防措施：跨项目共享资源用 `external: true` + 显式 `name`；理解 Compose 命名空间是"项目级"而非"全局"。

**陷阱3：`--scale` 与静态端口冲突**
- 现象：`docker compose up --scale worker=3` 报 `bind: address already in use`。
- 原因：worker 服务配了 `ports: ["8080:80"]`，三副本都抢主机 8080，第二个起不来。
- 解决方案：取消 `ports`（worker 内部消费不需暴露）；或用端口范围 `"8080-8082:80"`；或改 `expose: ["80"]` 仅内部可见。
- 预防措施：可水平扩展的服务不要静态映射主机端口，依赖 compose 内部 DNS 做服务发现；生产扩展用 K8s。

**陷阱4：override 自动合并导致配置被覆盖**
- 现象：生产环境某服务 `restart: unless-stopped` 始终不生效，但 compose 文件里明明写了。
- 原因：同目录有个遗留的 `docker-compose.override.yml`，里面 `restart: "no"` 自动合并覆盖了生产配置（单值字段后者覆盖前者）。
- 解决方案：生产用 `-f` 显式指定文件（禁用自动 override）；删除遗留 override 文件；用 `docker compose config` 排查合并结果。
- 预防措施：CI/生产环境脚本永远用 `-f` 显式列文件；定期用 `docker compose config` 审计最终配置。

**陷阱5：`$$` 与 `$` 的转义混淆**
- 现象：healthcheck 写 `pg_isready -U $POSTGRES_USER`，运行时变量未被替换或被 compose 提前插值成空。
- 原因：compose 文件中 `$VAR` 会被 compose 在解析阶段插值；要让 `$` 透传到容器内由 shell 展开，必须写 `$$VAR`。
- 解决方案：healthcheck/command 中需要容器运行时 shell 解析的变量用 `$$`：
  ```yaml
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
  ```
- 预防措施：凡是 command/healthcheck 里出现的 `$`，先想清楚"这是 compose 插值还是容器 shell 展开"，前者用 `$`，后者用 `$$`。

**陷阱6：`.env` 文件位置与 shell 变量优先级**
- 现象：`.env` 里设的变量"不生效"。
- 原因：① `.env` 不在执行 `docker compose` 的当前目录；② shell 已 export 同名变量（哪怕为空）覆盖了 `.env`；③ 误以为 `env_file` 能参与插值。
- 解决方案：确认 `.env` 在当前工作目录；`unset` 干扰的 shell 变量；用 `--env-file` 显式指定路径；用 `docker compose config` 看插值结果。
- 预防措施：CI 脚本里显式 `cd` 到 compose 文件目录或用 `--env-file`；分清"插值变量"与"容器环境变量"。

---

### 实践信号

#### 官方进阶文档
- Compose 文件参考（顶级字段、服务字段全集）：https://docs.docker.com/reference/compose-file/
- 控制启动顺序（depends_on + healthcheck + restart: true）：https://docs.docker.com/compose/how-tos/startup-order/
- 使用 profiles（角色化服务子集）：https://docs.docker.com/compose/how-tos/profiles/
- 多文件机制（merge / extends / include）：https://docs.docker.com/compose/how-tos/multiple-compose-files/
- Compose CLI 命令参考（up/down/ps/run/config 全参数）：https://docs.docker.com/reference/cli/docker/compose/
- 环境变量优先级与 COMPOSE_* 环境变量：https://docs.docker.com/compose/how-tos/environment-variables/envvars/
- Compose Bridge（compose 转 K8s manifests）：https://docs.docker.com/compose/bridge/

#### 社区热议话题
- **`depends_on` 在 v3 被移除 condition 又恢复的争议**：Compose v3 一度去掉 `condition`，社区强烈反弹，Specification 重新支持。讨论见 compose-spec 仓库 issue 与 Docker 论坛。
- **override 自动合并规则复杂难懂**：单值覆盖、多值追加、map 按 key 合并——Reddit r/docker 与 Stack Overflow 持续有"为什么我的 ports 被追加而不是覆盖"类问题，官方文档专门用一页讲 merging rules。
- **`docker compose watch` 取代 volume 挂载做热重载**：v2 引入的 watch 机制在 2024-2025 是社区热点，比 bind mount 更精准。
- **Compose vs K8s 边界**：每年都有"小型生产能不能用 Compose"的讨论，主流共识是单机小规模可以，多机/高可用必须 K8s。

#### 动手验证
1. **就绪等待对比实验**：写一个 `compose.yaml` 含 `web`（用 `curl` 探测 db）+ `db`（postgres）。先只用 `depends_on: [db]` 短语法，观察 web 启动时连接失败日志；再改为 `condition: service_healthy` + healthcheck，验证 web 是否等到 db healthy 才起。用 `docker compose up --abort-on-container-exit` 观察。
2. **override 合并规则验证**：建 `compose.yaml` + `compose.override.yaml`，主文件 `ports: ["8080:80"]`，override `ports: ["8081:80"]`，运行 `docker compose -f compose.yaml -f compose.override.yaml config` 观察合并结果是**追加**（两个端口都在）还是覆盖；再对 `image:` 字段做同样实验观察是否覆盖。借此理解单值 vs 多值字段合并差异。
3. **profiles 实战**：写含 5 个服务（2 个无 profile、3 个分属 dev/debug/tools profile）的 compose 文件，分别运行 `up`、`--profile debug up`、`--profile dev --profile debug up`、`run <tools服务>`，用 `docker compose ps` 验证每次启了哪些服务，对照官方 profiles 文档规则。
4. **`--scale` 端口冲突复现**：写一个 `ports: ["8080:80"]` 的服务，`docker compose up --scale web=3` 复现冲突，再分别用"删除 ports"、"端口范围"、"expose"三种方案解决并验证。

---

## 章节小结

Docker Compose 是从"单容器"走向"多容器应用"的必经之路。本章核心可归纳为四条主线：

1. **声明式模型**：一份 YAML（`compose.yaml`）描述服务、网络、卷、配置、密钥的期望状态，`docker compose up` 驱动到该状态。`services` 必填，`name` 顶级字段是 v2 推荐写法，`version` 已废弃。

2. **v2 是主线**：`docker compose`（Go，CLI 插件）取代 `docker-compose`（Python，独立二进制）。v2 带来 `--wait`、`--profile`、`watch`、`include`、`restart: true` 等关键能力，新项目应一律用 v2。

3. **就绪等待与多环境是两大工程难点**：
   - 就绪等待 = `depends_on` 长语法的三种 `condition` + `healthcheck` + `start_period` + `restart: true`，缺一不可；
   - 多环境 = 自动 override + 手动 `-f` + `extends`/`include` + `profiles` + `.env` 插值，组合使用时务必用 `docker compose config` 校验最终配置。

4. **边界清晰**：Compose 是单机编排器，不解决跨节点调度、自愈、滚动升级；生产多机用 K8s，可通过 `kompose` 或 `docker compose bridge` 把 compose 文件转 K8s manifests。把 Compose 学透，是把"声明式 + 期望状态"思维迁移到 K8s 的最佳跳板。

掌握 `depends_on` + `healthcheck` 的就绪等待、`.env` 插值与 `env_file` 的区别、override 合并规则、`--scale` 端口冲突、`$$` 转义这几个高频坑，即可在生产中稳健使用 Compose 编排中等规模应用栈。
