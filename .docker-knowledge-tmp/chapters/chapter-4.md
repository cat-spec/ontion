## 第4章 Dockerfile 与镜像构建

### 核心知识点

> 本章是 Docker 学习的分水岭：从「会用现成镜像」转向「自己造镜像」。Dockerfile 是一份纯文本的"镜像配方"，每条指令对应一层（layer），构建本质是指令序列 → 分层文件系统 → 可复用缓存的过程。掌握本章意味着你能写出小、快、安全、可复现的生产级镜像，并能用 BuildKit 把构建时间从十几分钟压到几十秒。

**Dockerfile 是什么**
- 概念解释：Dockerfile 是一份纯文本构建脚本，由一组按顺序执行的指令（instruction）组成，每条指令描述镜像的一个变更动作（装包、拷贝文件、设环境变量、声明启动命令等）。`docker build` 读取它并产出 OCI 格式的镜像。
- 核心作用：把"环境搭建"从手工操作固化为可版本化、可 review、可复现的代码，是 Infrastructure as Code 思想在容器领域的体现。
- 基本用法：
  ```dockerfile
  # Dockerfile
  FROM nginx:1.27-alpine
  COPY ./html /usr/share/nginx/html
  EXPOSE 80
  CMD ["nginx", "-g", "daemon off;"]
  ```
  ```bash
  docker build -t my-site:1.0 .
  docker run -d -p 8080:80 my-site:1.0
  ```
- 注意事项：指令大小写不敏感，但约定俗成全大写；注释以 `#` 开头且必须独占一行；文件名默认 `Dockerfile`（无扩展名），用 `-f` 可指定其他路径。

**FROM：构建起点**
- 概念解释：FROM 是 Dockerfile 的第一条非注释指令（多阶段构建中每个 stage 都以 FROM 开头），指定基础镜像。任何镜像都不是"凭空"开始的，必须站在已有镜像肩膀上。
- 核心作用：决定镜像的操作系统、初始包集合、架构（amd64/arm64），是镜像体积和安全基线的最大决定因素。
- 基本用法：
  ```dockerfile
  FROM ubuntu:24.04
  FROM node:22-alpine
  FROM scratch              # 空镜像，用于打包静态二进制
  FROM golang:1.23 AS builder   # 多阶段构建命名阶段
  FROM --platform=linux/arm64 alpine:3.20   # 指定目标架构
  ```
- 注意事项：务必钉版本（`nginx:1.27.3-alpine` 而非 `nginx:latest`），否则同一 Dockerfile 在不同时间构建结果不同；`scratch` 不是真实镜像，是从零开始的特殊占位符。

**RUN：构建期执行命令**
- 概念解释：RUN 在构建时执行任意 shell 命令（装包、编译、解压、创建目录等），其结果被 commit 成一个新层。RUN 只在 build 阶段跑一次，运行容器时不再执行。
- 核心作用：把"环境初始化"固化进镜像，避免每次启动容器都重装一遍。
- 基本用法：
  ```dockerfile
  # shell 形式（默认 /bin/sh -c）
  RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
      && rm -rf /var/lib/apt/lists/*

  # exec 形式（不经过 shell，无变量展开、无管道）
  RUN ["/usr/bin/apt-get", "install", "-y", "curl"]
  ```
- 注意事项：每条 RUN 产生一层，应将相关命令用 `&&` 串联并清理缓存（apt 缓存、npm cache、pip cache）以减小体积；`apt-get update` 与 `apt-get install` 必须在同一条 RUN 中，否则缓存层会导致"包列表过期但被复用"的安全隐患。

**COPY 与 ADD：把文件装进镜像**
- 概念解释：COPY 把本地文件/目录原样复制到镜像内；ADD 在 COPY 基础上多两个能力——自动解压本地 tar 包、支持远程 URL（但远程下载能力已被官方明确不推荐）。
- 核心作用：把源码、配置、二进制等本地资产注入镜像。
- 基本用法：
  ```dockerfile
  COPY ./app /app
  COPY package.json package-lock.json /app/
  COPY nginx.conf /etc/nginx/nginx.conf

  # ADD 解压 tar（唯一推荐用 ADD 的场景）
  ADD rootfs.tar.gz /
  ```
- 注意事项：复制目录时，源路径末尾是否带 `/` 影响行为；COPY 默认以 root:root 创建文件，可用 `COPY --chown=node:node --chmod=0644` 调整（BuildKit 支持）；远程 URL 下载用 ADD 不会校验校验和，应改用 `RUN curl ... && sha256sum`。

**WORKDIR / ENV / ARG：环境与元数据**
- 概念解释：WORKDIR 设置后续指令的工作目录（不存在会自动创建）；ENV 设置运行时常驻的环境变量；ARG 设置仅在构建期可见、可被 `--build-arg` 覆盖的变量。
- 核心作用：WORKDIR 让路径可读且避免相对路径歧义；ENV 影响容器运行时行为（如 `NODE_ENV=production`）；ARG 用于参数化构建（如版本号、镜像架构）。
- 基本用法：
  ```dockerfile
  ARG NODE_VERSION=22
  FROM node:${NODE_VERSION}-alpine
  WORKDIR /app
  ENV NODE_ENV=production \
      PATH=/app/node_modules/.bin:$PATH
  COPY package*.json ./
  RUN npm ci --omit=dev
  ```
- 注意事项：ENV 写入镜像元数据，会泄露到 `docker inspect`；敏感信息（Token、密码）绝不能用 ENV，应改用 secret mount 或运行时注入；ARG 在 FROM 之前声明的叫"全局 ARG"，只能用于 FROM 行。

**CMD vs ENTRYPOINT：容器启动命令**
- 概念解释：CMD 是容器默认启动命令，可在 `docker run` 后被任意命令覆盖；ENTRYPOINT 是固定执行的入口程序，`docker run` 后的参数会作为 ENTRYPOINT 的入参追加。两者可组合：ENTRYPOINT 定程序、CMD 定默认参数。
- 核心作用：CMD 适合"可被替换的默认行为"（如 shell 工具镜像）；ENTRYPOINT 适合"固定服务程序"（如 nginx、mysql）；组合用法是生产镜像的标准模式。
- 基本用法：
  ```dockerfile
  # exec 形式（推荐，能接收信号）
  CMD ["nginx", "-g", "daemon off;"]
  ENTRYPOINT ["python", "app.py"]
  CMD ["--host", "0.0.0.0", "--port", "8000"]

  # shell 形式（实际执行 /bin/sh -c "..."，PID 1 是 sh，收不到 SIGTERM）
  CMD nginx -g "daemon off;"
  ```
- 注意事项：exec 形式是 JSON 数组，必须用双引号；shell 形式会被包装成 `sh -c`，导致应用不是 PID 1，无法优雅退出；ENTRYPOINT 用 shell 形式会使 CMD/`docker run` 参数完全失效，是常见坑。

**多阶段构建（Multi-stage Build）**
- 概念解释：在一个 Dockerfile 中写多个 FROM，每个 FROM 开启一个独立的构建阶段；用 `AS` 给阶段命名，再用 `COPY --from=<阶段名>` 把前一阶段的产物拷到后一阶段。最终镜像只保留最后一个阶段。
- 核心作用：把"构建工具链"（编译器、SDK、源码）与"运行时"分离，让最终镜像只含二进制 + 最小运行时，体积可从 1GB 降到 20MB。
- 基本用法：
  ```dockerfile
  # ---- stage 1: build ----
  FROM golang:1.23-alpine AS builder
  WORKDIR /src
  COPY go.mod go.sum ./
  RUN go mod download
  COPY . .
  RUN CGO_ENABLED=0 go build -o /out/app -ldflags="-s -w" ./cmd/server

  # ---- stage 2: runtime ----
  FROM gcr.io/distroless/static-debian12:nonroot
  COPY --from=builder /out/app /app
  USER nonroot:nonroot
  ENTRYPOINT ["/app"]
  ```
- 注意事项：阶段名建议用语义化命名（builder、test、runtime）而非数字；`COPY --from=0` 用索引也行但不直观；可以从外部镜像 `COPY --from=nginx:1.27-alpine /usr/sbin/nginx /usr/sbin/nginx`；多阶段不会自动并行，依赖关系决定顺序。

**BuildKit 特性：cache / secret / ssh mount**
- 概念解释：BuildKit 是 Docker 23.0 起默认的构建后端（25.x 仍默认启用），通过 `# syntax=docker/dockerfile:1` 头部解锁高级特性。`RUN --mount=type=cache` 把缓存目录持久化到构建机、跨构建复用；`type=secret` 把机密文件临时挂入不写入镜像层；`type=ssh` 把宿主 SSH agent 转发进构建以拉私有 Git 仓库。
- 核心作用：cache mount 让 npm/pip/maven 缓存复用，二次构建从分钟级降到秒级；secret mount 解决"构建需要 token 又不能写进镜像"的难题。
- 基本用法：
  ```dockerfile
  # syntax=docker/dockerfile:1
  FROM node:22-alpine
  WORKDIR /app

  # 包缓存复用
  RUN --mount=type=cache,target=/root/.npm \
      npm ci

  # 私密 token 不留痕
  RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
      npm install

  # 拉私有 Git 仓库
  RUN --mount=type=ssh \
      git clone git@github.com:org/private-repo.git
  ```
  ```bash
  DOCKER_BUILDKIT=1 docker build \
    --secret id=npmrc,src=$HOME/.npmrc \
    --ssh default=$SSH_AUTH_SOCK \
    -t app:1.0 .
  ```
- 注意事项：cache mount 默认是本地缓存，跨机器构建需配合 `--cache-from/--cache-to` 类型为 `registry` 或 `gha`；secret mount 文件不会出现在最终镜像的任何层，`docker history` 也看不到；`type=ssh` 需要 `--ssh` 参数转发 agent，且 Dockerfile 内不要 `COPY ~/.ssh`。

**镜像分层与构建缓存**
- 概念解释：Dockerfile 每条指令（RUN/COPY/ADD）产生一个只读层（layer），所有层堆叠成镜像 rootfs。构建时 BuildKit 自上而下检查每条指令的输入是否变化，未变化则复用缓存层，一旦某层失效，其后所有层重建。
- 核心作用：分层 + 缓存让"增量构建"成为可能，是 Docker 构建快的根本原因；理解缓存机制才能写出"改一行代码不重装依赖"的高效 Dockerfile。
- 基本用法：
  ```dockerfile
  # ❌ 错误顺序：源码一变就重装依赖
  COPY . .
  RUN npm ci

  # ✅ 正确顺序：先拷依赖清单，再装依赖，最后拷源码
  COPY package*.json ./
  RUN npm ci
  COPY . .
  ```
  ```bash
  docker build --no-cache -t app:1.0 .          # 强制忽略缓存
  docker build --build-arg VERSION=1.2.3 -t app:1.0 .   # 传 ARG
  docker build --target builder -t app:builder . # 只构建到某阶段
  ```
- 注意事项：`COPY` 的缓存键是文件内容哈希，连时间戳变化都会失效，需用 `.dockerignore` 排除 `node_modules`、`.git` 等；`ARG` 值变化会让使用它的 RUN 失效；`--no-cache` 不影响外部 base image 拉取缓存。

**构建优化：基础镜像选择与层合并**
- 概念解释：基础镜像三档——`full`（如 `node:22`，含完整 Debian、构建工具，~1GB）、`slim`（如 `node:22-slim`，精简 Debian，~200MB）、`alpine`（基于 musl libc，~50MB）、`distroless`（无 shell、无包管理器，仅运行时）。镜像越小，拉取越快、攻击面越小。
- 核心作用：在"兼容性"与"体积/安全"间权衡；生产推荐 slim 或 distroless，alpine 因 musl libc 对 Node/Python 原生模块有兼容性风险。
- 基本用法：
  ```dockerfile
  # distroless + 多阶段，最终镜像无 shell、无 root
  FROM node:22 AS build
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build

  FROM gcr.io/distroless/nodejs22-debian12:nonroot
  WORKDIR /app
  COPY --from=build /app/node_modules ./node_modules
  COPY --from=build /app/dist ./dist
  USER nonroot
  CMD ["dist/server.js"]
  ```
- 注意事项：distroless 无 shell，`CMD` 必须用 exec 形式，无法 `docker exec -it ... sh` 进容器调试（可加 `:debug` 标签版本）；alpine 装 Python 包若含 C 扩展常因 musl 报错，需 `apk add build-base`；slim 缺 `curl`、`ca-certificates` 时要手动补。

**命名与打标签**
- 概念解释：镜像名格式 `registry/repo:tag`（如 `registry.cn-hangzhou.aliyuncs.com/myorg/web:1.2.3`）。`docker tag` 不复制镜像，只是给同一个 image ID 加一个引用指针。未指定 tag 默认 `:latest`，但 `latest` 是个普通标签，不会自动指向最新版本。
- 核心作用：标签是镜像版本管理的唯一手段，规范命名能让 CI/CD、回滚、漏洞扫描有据可依。
- 基本用法：
  ```bash
  # 本地构建打标签
  docker build -t myorg/web:1.2.3 -t myorg/web:latest -t myorg/web:git-abc1234 .

  # 给已存在镜像追加标签
  docker tag myorg/web:1.2.3 registry.cn-hangzhou.aliyuncs.com/myorg/web:1.2.3

  # 推送到远程仓库
  docker push registry.cn-hangzhou.aliyuncs.com/myorg/web:1.2.3
  ```
- 注意事项：生产推荐"语义化版本 + git sha"双标签（`1.2.3` + `git-a1b2c3`），便于溯源；`latest` 标签用于 dev 环境可以，但生产环境部署 `latest` 等于"部署了什么自己都不知道"；私有 registry 推送前需 `docker login`。

---

### 章节题目

#### 【面试题】

**Q1（高频题）：CMD 和 ENTRYPOINT 有什么区别？如何配合使用？**
- 难度：进阶
- 来源：阿里、字节、美团等大厂面试高频题
- 答案：
  - CMD 是默认命令，可被 `docker run <image> <cmd>` 完全覆盖；
  - ENTRYPOINT 是固定入口，`docker run` 后的参数会作为 ENTRYPOINT 的入参追加，不会被覆盖；
  - 两者都有 shell 形式（`CMD nginx -g "..."`，实际 `sh -c`）和 exec 形式（`CMD ["nginx","-g","daemon off;"]`）；
  - 推荐组合：`ENTRYPOINT ["python","app.py"]` + `CMD ["--help"]`，前者定程序，后者定可被覆盖的默认参数；
  - 若 ENTRYPOINT 用 shell 形式，CMD 和 `docker run` 参数都会失效，是经典坑；
  - 生产镜像优先 exec 形式，因为 shell 形式下 PID 1 是 sh，无法接收 SIGTERM 优雅退出。
- 考点：理解 ENTRYPOINT/CMD 的覆盖语义、shell vs exec 形式对信号处理的影响。

**Q2：写一个 Dockerfile，要求镜像体积最小、能接收 SIGTERM 优雅退出、不带 shell。**
- 难度：深度
- 来源：腾讯云、Shopee 面试真题
- 答案：
  ```dockerfile
  # syntax=docker/dockerfile:1
  FROM golang:1.23-alpine AS builder
  WORKDIR /src
  COPY go.mod go.sum ./
  RUN --mount=type=cache,target=/root/.cache/go-build \
      --mount=type=cache,target=/go/pkg/mod \
      go mod download
  COPY . .
  RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app ./cmd/server

  FROM gcr.io/distroless/static-debian12:nonroot
  COPY --from=builder /app /app
  USER nonroot:nonroot
  ENTRYPOINT ["/app"]   # exec 形式，PID 1 是 /app，能收信号
  ```
  关键点：多阶段 + distroless（无 shell）+ exec 形式 ENTRYPOINT + nonroot 用户 + cache mount。
- 考点：综合多阶段、distroless、信号处理、缓存优化。

**Q3：为什么 `apt-get update` 和 `apt-get install` 必须在同一条 RUN 里？**
- 难度：进阶
- 来源：Google SRE 面试、SRE 岗位常见
- 答案：分两条 RUN 时，`apt-get update` 产生的包列表会被固化为一个缓存层；下次构建若该层未失效会被复用，但 `install` 层若因依赖变化而重建，用的就是过期的包列表，导致装到旧版本包（安全漏洞）。合并为一条 RUN 让两者在同一层原子完成，且在末尾 `rm -rf /var/lib/apt/lists/*` 清理。
- 考点：缓存层复用与安全的关系。

#### 【论坛题】

**Q4：为什么我的 `docker build` 把整个 `node_modules` 都上传了，构建巨慢？**
- 难度：基础
- 来源：Stack Overflow 高赞问题 #32754022（"docker build sending context to daemon very slow"）
- 答案：`docker build` 会把构建上下文（当前目录）整个打包发给 daemon，再由 Dockerfile 决定 COPY 哪些。`node_modules`、`.git`、`dist` 等不该进镜像的目录若没排除，会被全量上传。解决：在项目根加 `.dockerignore`：
  ```
  node_modules
  .git
  dist
  *.log
  .env
  .vscode
  ```
- 考点：构建上下文与 `.dockerignore` 的作用。

**Q5：alpine 镜像跑 Node 报 `Error: cannot find module ...` 或 `musl` 相关错误，怎么办？**
- 难度：进阶
- 来源：Node.js 官方 issue #40531、Reddit r/docker 热帖
- 答案：Node 官方镜像基于 glibc，但 alpine 用 musl libc，含原生模块（如 `sharp`、`bcrypt`、`node-sass`、`canvas`）的包需重新编译为 musl 版本，否则报错。三种解法：
  1. 改用 `node:22-slim`（基于 Debian，glibc，兼容性好，体积仅比 alpine 大 ~150MB）；
  2. 留 alpine 但加 `apk add --no-cache python3 make g++` 并 `npm rebuild`；
  3. 用多阶段：在 `node:22` 中编译原生模块，再拷到 `node:22-alpine`。
  生产建议直接用 slim，避免 musl 陷阱。
- 考点：alpine musl libc 与 Node 原生模块的兼容性。

**Q6：`COPY` 和 `ADD` 到底该用哪个？官方为什么说 ADD 不推荐？**
- 难度：基础
- 来源：Stack Overflow #24958136 "COPY vs ADD in Dockerfile"
- 答案：COPY 只做本地文件复制，语义清晰；ADD 多了两个隐式行为——自动解压本地 tar、支持远程 URL 下载。这两个"魔法"行为让阅读 Dockerfile 的人无法一眼看出会发生什么，且远程下载无校验和、不缓存。官方 Dockerfile best practices 明确建议：除"自动解压本地 tar"这一场景外，全部用 COPY。
- 考点：COPY vs ADD 的语义差异与最佳实践。

#### 【期末题/认证题】

**Q7（DCA 认证题）：下面 Dockerfile 中，容器启动后实际执行什么命令？**
```dockerfile
FROM alpine
ENTRYPOINT ["/bin/echo", "Hello"]
CMD ["World"]
```
运行 `docker run myimage` 和 `docker run myimage Alice` 分别输出什么？
- 难度：进阶
- 来源：Docker Certified Associate (DCA) 真题样例
- 答案：
  - `docker run myimage` → 输出 `Hello World`（ENTRYPOINT + CMD 拼接为 `echo Hello World`）；
  - `docker run myimage Alice` → 输出 `Hello Alice`（CMD 被 `Alice` 覆盖，与 ENTRYPOINT 拼成 `echo Hello Alice`）。
  - 规则：exec 形式的 ENTRYPOINT 与 CMD 会拼接成一个命令行；`docker run` 后的参数替换 CMD 部分。
- 考点：ENTRYPOINT + CMD 组合时的参数拼接语义。

**Q8（期末题）：判断对错——"Dockerfile 中每条 RUN 指令都会生成一个新层，因此应尽量把命令写在一行。"**
- 难度：基础
- 来源：某高校《云计算》课程期末题
- 答案：前半句对，后半句片面。每条 RUN 确实产生一层，但"合并到一行"不是唯一目标，更应关注：(1) 相关命令合并以避免中间层残留无用文件（如 apt 缓存）；(2) 不相关命令分开以充分利用缓存（如装系统包与装 npm 包应分开，让前者命中缓存）。无脑合并会让缓存粒度变粗，一处变化导致整块重建。
- 考点：分层、缓存与 RUN 拆分的权衡。

**Q9（认证题）：`ARG` 和 `ENV` 都能定义变量，下列说法正确的是？**
  A. ARG 在运行时可见，ENV 仅在构建时可见
  B. ARG 仅在构建时可见（除非显式 ENV 引用），ENV 在构建和运行时都可见
  C. 两者都可通过 `--build-arg` 覆盖
  D. ENV 的值不会出现在 `docker inspect` 中
- 难度：进阶
- 来源：Linux Foundation 容器工程师认证样题
- 答案：B。ARG 默认只在构建期可见，不会进入运行时环境；ENV 进入镜像元数据，运行时和 `docker inspect` 都能看到。`--build-arg` 只能覆盖 ARG。要把 ARG 传到运行时需 `ENV VERSION=$VERSION`。
- 考点：ARG vs ENV 的可见性差异。

#### 【官网题】

**Q10：根据 Dockerfile reference，`COPY --from` 可以从哪些来源拷贝？**
- 难度：进阶
- 来源：https://docs.docker.com/engine/reference/builder/#copy---from
- 答案：`COPY --from` 的来源可以是：
  1. 同一 Dockerfile 中前序阶段的名字（`COPY --from=builder`）或索引（`COPY --from=0`）；
  2. 任意外部镜像（`COPY --from=nginx:1.27-alpine /usr/sbin/nginx /usr/sbin/nginx`）；
  3. 通过 `--from=image` 指定的、由 BuildKit 解析的镜像（包括 OCI 镜像）。
- 考点：多阶段构建中 `COPY --from` 的多种来源。

**Q11：根据 BuildKit 文档，`RUN --mount=type=cache` 的缓存共享范围默认是什么？如何避免不同分支互相污染？**
- 难度：深度
- 来源：https://docs.docker.com/build/cache/optimize/#use-cache-mounts
- 答案：默认情况下，同一构建机上、同一 `target` 路径、同一 `id` 的 cache mount 在所有构建之间共享（不区分分支、不区分镜像）。为避免污染，可用 `id=` 给不同项目/分支隔离缓存，例如 `RUN --mount=type=cache,id=web-npm,target=/root/.npm`；也可用 `sharing=locked`（默认）或 `sharing=private`（每次构建独占，不共享）控制并发行为。跨机器共享需 `--cache-to type=registry`。
- 考点：cache mount 的共享语义与隔离手段。

**Q12：根据 Dockerfile reference，`HEALTHCHECK` 的 `--interval`、`--timeout`、`--start-period`、`--retries` 默认值分别是多少？**
- 难度：基础
- 来源：https://docs.docker.com/engine/reference/builder/#healthcheck
- 答案：`--interval=30s`（检查间隔）、`--timeout=30s`（单次检查超时）、`--start-period=0s`（启动宽限期，期间失败不计入 retries）、`--retries=3`（连续失败 N 次才标记 unhealthy）。容器启动后首次检查在 `--interval` 后执行。
- 考点：HEALTHCHECK 参数默认值。

#### 【实战题】

**Q13：为一个 Spring Boot 项目（Maven 构建，产出 `app.jar`）写一个生产级 Dockerfile，要求：多阶段、分层、缓存优化、最终镜像基于 `eclipse-temurin:21-jre-alpine`、非 root 运行。**
- 难度：实战
- 来源：企业项目实战（金融行业 Java 微服务上云）
- 答案：
  ```dockerfile
  # syntax=docker/dockerfile:1
  # ---- stage 1: build ----
  FROM maven:3.9-eclipse-temurin-21 AS builder
  WORKDIR /build
  # 先拷 pom 利用缓存下载依赖
  COPY pom.xml .
  RUN --mount=type=cache,target=/root/.m2 \
      mvn dependency:go-offline -B
  COPY src ./src
  RUN --mount=type=cache,target=/root/.m2 \
      mvn package -DskipTests -B && \
      JAR=$(ls target/*.jar | head -1) && cp $JAR /app.jar

  # ---- stage 2: 提取 layers（Spring Boot 分层 jar）----
  FROM builder AS extract
  RUN java -Djarmode=layertools -jar /app.jar extract

  # ---- stage 3: runtime ----
  FROM eclipse-temurin:21-jre-alpine
  RUN addgroup -S spring && adduser -S spring -G spring
  WORKDIR /app
  COPY --from=extract /build/dependencies/ ./
  COPY --from=extract /build/spring-boot-loader/ ./
  COPY --from=extract /build/snapshot-dependencies/ ./
  COPY --from=extract /build/application/ ./
  USER spring
  ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
  ```
  关键点：mvn cache mount、Spring Boot layertools 分层（依赖变化只重建 application 层）、非 root 用户、alpine + jre。
- 考点：Java 多阶段构建、分层 jar、缓存优化、非 root。

**Q14：前端 React 项目（Vite 构建）写 Dockerfile，要求：构建产物用 nginx 托管、支持多架构（amd64/arm64）、镜像 < 50MB。**
- 难度：实战
- 来源：互联网公司前端容器化
- 答案：
  ```dockerfile
  # syntax=docker/dockerfile:1
  FROM --platform=$BUILDPLATFORM node:22-alpine AS build
  WORKDIR /app
  COPY package*.json ./
  RUN --mount=type=cache,target=/root/.npm npm ci
  COPY . .
  RUN npm run build

  FROM nginx:1.27-alpine
  COPY --from=build /app/dist /usr/share/nginx/html
  COPY nginx.conf /etc/nginx/conf.d/default.conf
  EXPOSE 80
  HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost/ || exit 1
  CMD ["nginx", "-g", "daemon off;"]
  ```
  ```bash
  docker buildx build --platform linux/amd64,linux/arm64 -t myorg/web:1.0 --push .
  ```
  关键点：`$BUILDPLATFORM` 让构建在原生架构跑（避免 QEMU 模拟慢）、nginx-alpine 约 50MB、HEALTHCHECK 监活。
- 考点：前端多阶段、多架构构建、nginx 静态托管。

**Q15：构建时需要拉取私有 npm 包，要求 token 不能出现在镜像层、不能出现在 `docker history`。给出方案。**
- 难度：深度
- 来源：企业安全合规实战
- 答案：用 BuildKit 的 secret mount：
  ```dockerfile
  # syntax=docker/dockerfile:1
  FROM node:22-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
      npm ci --omit=dev
  COPY . .
  CMD ["node", "index.js"]
  ```
  ```bash
  # .npmrc 内容形如：//registry.npmjs.org/:_authToken=${NPM_TOKEN}
  # 构建时通过环境变量注入
  NPM_TOKEN=npm_xxx docker build --secret id=npmrc,env=NPM_TOKEN -t app:1.0 .
  # 或从文件
  docker build --secret id=npmrc,src=$HOME/.npmrc -t app:1.0 .
  ```
  关键点：secret mount 文件只在 RUN 执行时挂入，不写入任何镜像层，`docker history` 和最终镜像都查不到 token；切勿用 `ARG NPM_TOKEN`（会进 history）或 `COPY .npmrc`（会进镜像）。
- 考点：BuildKit secret mount、镜像机密安全。

---

### 项目常用场景

**场景1：多阶段构建 Go 应用（生产标配）**
- 背景：Go 编译后是单一静态二进制，理想最终镜像应只含二进制本身，无需 Go 工具链。直接用 `golang:1.23` 跑会让镜像达 800MB+，且包含编译器、源码，攻击面大。
- 解决方案：
  ```dockerfile
  # syntax=docker/dockerfile:1
  FROM golang:1.23-alpine AS builder
  WORKDIR /src
  # 利用 cache mount 复用 go mod 缓存，二次构建秒级
  COPY go.mod go.sum ./
  RUN --mount=type=cache,target=/root/.cache/go-build \
      --mount=type=cache,target=/go/pkg/mod \
      go mod download
  COPY . .
  ARG VERSION=dev
  RUN --mount=type=cache,target=/root/.cache/go-build \
      --mount=type=cache,target=/go/pkg/mod \
      CGO_ENABLED=0 GOOS=linux go build \
      -ldflags="-s -w -X main.Version=${VERSION}" \
      -o /out/server ./cmd/server

  # 用 scratch 或 distroless，最终镜像 ~20MB
  FROM gcr.io/distroless/static-debian12:nonroot
  COPY --from=builder /out/server /server
  USER nonroot:nonroot
  EXPOSE 8080
  ENTRYPOINT ["/server"]
  ```
- 最佳实践：
  1. `CGO_ENABLED=0` 产出纯静态二进制，才能跑在 scratch/distroless；
  2. `-ldflags="-s -w"` 去掉调试信息，二进制体积减半；
  3. cache mount 让 `go mod download` 和编译缓存跨构建复用；
  4. distroless `:nonroot` 自动以非 root 运行；
  5. 构建：`docker build --build-arg VERSION=$(git describe) -t server:1.0 .`。

**场景2：构建前端 React 项目并托管于 nginx**
- 背景：Vite/Webpack 构建产出静态文件（HTML/JS/CSS），无需 Node 运行时。常见错误是把 `node:22` 当运行时镜像，导致镜像 1GB+ 且暴露源码。
- 解决方案：
  ```dockerfile
  # syntax=docker/dockerfile:1
  FROM node:22-alpine AS build
  WORKDIR /app
  COPY package*.json ./
  RUN --mount=type=cache,target=/root/.npm npm ci
  COPY . .
  RUN npm run build

  FROM nginx:1.27-alpine
  # 删除默认配置，使用 SPA 路由友好配置
  RUN rm /etc/nginx/conf.d/default.conf
  COPY nginx.conf /etc/nginx/conf.d/default.conf
  COPY --from=build /app/dist /usr/share/nginx/html
  EXPOSE 80
  HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1
  CMD ["nginx", "-g", "daemon off;"]
  ```
  `nginx.conf`（SPA 路由回退）：
  ```nginx
  server {
    listen 80;
    root /usr/share/nginx/html;
    location / {
      try_files $uri $uri/ /index.html;
    }
    location ~* \.(js|css|png|jpg|svg|woff2)$ {
      expires 1y;
      add_header Cache-Control "public, immutable";
    }
  }
  ```
- 最佳实践：用 `.dockerignore` 排除 `node_modules`、`dist`、`.git`；多架构构建 `docker buildx build --platform linux/amd64,linux/arm64`；静态资源加长缓存头。

**场景3：Java Maven 项目缓存优化构建**
- 背景：Maven 每次全量下载依赖要十几分钟，是 Java 容器化最大痛点。错误做法是 `COPY . . && mvn package`，导致改一行代码重下所有依赖。
- 解决方案：
  ```dockerfile
  # syntax=docker/dockerfile:1
  FROM maven:3.9-eclipse-temurin-21 AS builder
  WORKDIR /build
  # 1. 先拷 pom，下载依赖（pom 不变则命中缓存）
  COPY pom.xml .
  RUN --mount=type=cache,target=/root/.m2 \
      mvn dependency:go-offline -B
  # 2. 拷源码，编译
  COPY src ./src
  RUN --mount=type=cache,target=/root/.m2 \
      mvn package -DskipTests -B
  # 3. 提取分层 jar（Spring Boot 特性，让依赖与应用分离）
  RUN cp target/*.jar /app.jar && \
      java -Djarmode=layertools -jar /app.jar extract

  FROM eclipse-temurin:21-jre-alpine
  RUN addgroup -S spring && adduser -S spring -G spring
  WORKDIR /app
  # 按变更频率从低到高拷贝，最大化缓存命中
  COPY --from=builder /build/dependencies/ ./
  COPY --from=builder /build/spring-boot-loader/ ./
  COPY --from=builder /build/snapshot-dependencies/ ./
  COPY --from=builder /build/application/ ./
  USER spring
  ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
  ```
- 最佳实践：
  1. `--mount=type=cache,target=/root/.m2` 跨构建复用 Maven 本地仓库；
  2. Spring Boot layertools 把 jar 拆成「依赖/loader/snapshot 依赖/应用」四层，改代码只重建最后一层；
  3. 运行时用 `jre-alpine` 而非 `jdk`，体积减半；
  4. 非 root 用户 `spring` 运行。

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|------|------|---------|---------|
| **CMD** | **ENTRYPOINT** | CMD 可被 `docker run` 参数完全覆盖；ENTRYPOINT 不被覆盖，`docker run` 参数作为其入参追加。两者 exec 形式拼接成最终命令行 | CMD：默认可替换行为（工具镜像）；ENTRYPOINT：固定服务程序；组合：ENTRYPOINT 定程序 + CMD 定默认参数 |
| **COPY** | **ADD** | COPY 仅复制本地文件，语义透明；ADD 额外支持自动解压本地 tar 和远程 URL 下载（后者已不推荐） | COPY：绝大多数文件复制场景；ADD：仅"自动解压本地 tar 包到镜像"这一种场景 |
| **ARG** | **ENV** | ARG 仅构建期可见，不进运行时环境，可被 `--build-arg` 覆盖；ENV 进入镜像元数据，构建期和运行时都可见，会出现在 `docker inspect` | ARG：版本号、架构等构建参数；ENV：运行时配置（NODE_ENV、PATH）。敏感信息两者都不能用 |
| **RUN**（build 阶段） | **CMD**（run 阶段） | RUN 在构建时执行一次，结果固化进镜像层；CMD 在容器启动时执行，定义容器默认行为，不产生镜像层 | RUN：装包、编译、创建目录；CMD：启动服务进程。RUN 写错会撑大镜像，CMD 写错会导致容器启动失败 |
| **shell 形式** | **exec 形式** | shell 形式（`CMD nginx -g "..."`）被包装为 `sh -c "..."`，PID 1 是 sh；exec 形式（`CMD ["nginx","-g","daemon off;"]`）直接 exec，应用是 PID 1 | exec 形式：生产服务（需接收 SIGTERM 优雅退出）；shell 形式：需要变量展开、管道、重定向时（但应尽量避免用于启动命令） |
| **`--build-arg`** | **`docker run -e`** | 前者在构建时传入 ARG，影响镜像内容；后者在运行时传入 ENV，不影响镜像内容，同一镜像可跑不同配置 | `--build-arg`：构建参数化（版本、特性开关）；`-e`：环境差异化配置（数据库地址、日志级别） |

---

### 常见陷阱与坑点

**陷阱1：构建上下文过大导致构建卡在 "sending context to daemon"**
- 现象：`docker build .` 长时间停在 `=> => transferring context`，明明只 COPY 了一个小文件。
- 原因：`docker build` 会把当前目录所有文件打包发给 daemon，再由 Dockerfile 决定用哪些。若目录含 `node_modules`（数百 MB）、`.git`（GB 级）、`dist`、`*.log`、`*.mp4`，全量上传耗时巨大。
- 解决方案：项目根加 `.dockerignore`：
  ```
  node_modules
  .git
  dist
  build
  *.log
  .env
  .env.*
  .vscode
  .idea
  coverage
  *.tar
  *.mp4
  Dockerfile*
  .dockerignore
  ```
- 预防措施：`.dockerignore` 应作为项目脚手架默认文件；CI 中用 `du -sh .` 监控上下文大小；用 `docker build --progress=plain` 观察上下文传输耗时。

**陷阱2：机密信息硬编码进镜像（Token、密码、私钥）**
- 现象：`docker history app:1.0` 能看到 `ARG NPM_TOKEN=npm_xxx` 或 `RUN curl -u admin:password123 ...`，镜像推到 registry 后任何能 pull 的人都能拿到机密。
- 原因：ARG/RUN 的命令行会进镜像元数据层；COPY 进来的 `.env`、`id_rsa` 会进文件层；ENV 的值进 `docker inspect`。
- 解决方案：用 BuildKit `--mount=type=secret`：
  ```dockerfile
  RUN --mount=type=secret,id=npm_token,target=/root/.npmrc \
      npm ci
  ```
  ```bash
  docker build --secret id=npm_token,env=NPM_TOKEN -t app .
  ```
  运行时机密用 `docker run -e`、`--env-file`、Docker Secrets、K8s Secret 注入。
- 预防措施：CI 流水线加 `dive` 或 `trivy fs` 扫描镜像层；禁止在 Dockerfile 中出现 `password`、`token`、`secret` 字样；Code Review 重点查 ARG/COPY/ENV。

**陷阱3：缓存失效雪崩——改一行代码重装所有依赖**
- 现象：`docker build` 每次 5 分钟，明明只改了一个 `.go` 文件。
- 原因：Dockerfile 顺序错误，`COPY . .` 写在 `RUN go mod download` 之前，导致任何源码变化都让 `go mod download` 缓存失效，重新下载所有依赖。
- 解决方案：先拷"依赖清单文件"，再装依赖，最后拷全部源码：
  ```dockerfile
  COPY go.mod go.sum ./
  RUN go mod download
  COPY . .
  RUN go build
  ```
  依赖清单变化频率远低于源码，这样改代码只会让最后两层失效。
- 预防措施：理解缓存失效规则（某层失效其后所有层重建）；用 `dive` 工具查看每层缓存命中情况；CI 中监控构建时间，异常增长即排查。

**陷阱4：alpine 的 musl libc 兼容性问题**
- 现象：Node/Python 镜像从 `node:22` 换成 `node:22-alpine` 后，报 `Error loading shared library ld-musl-x86_64.so.1`、`Module not found`、DNS 解析失败、`getaddrinfo` 报错。
- 原因：alpine 用 musl libc 而非 glibc，含 C 扩展的 npm 包（sharp、bcrypt、canvas、node-sass）、Python 包（numpy、pandas、cryptography）需重新编译为 musl 版本；部分应用硬依赖 glibc 行为（如 DNS 解析器顺序）。
- 解决方案：
  1. 优先用 `node:22-slim` / `python:3.12-slim`（基于 Debian，glibc，兼容性好，体积比 alpine 大 ~150MB 但省心）；
  2. 必须用 alpine 时，加 `apk add --no-cache python3 make g++` 并 `npm rebuild`；
  3. DNS 问题用 `node:22-alpine` 时可加 `--dns` 或在镜像装 `bind-tools`。
- 预防措施：团队默认基础镜像用 slim 而非 alpine；CI 跑 alpine 镜像的 smoke test；Node 项目 `package.json` 锁定原生模块的 musl 预编译版本。

**陷阱5：PID 1 信号处理——容器收不到 SIGTERM，强制 kill 丢数据**
- 现象：`docker stop` 后等 10 秒才退出（默认 grace period），应用日志没有"正在关闭"记录，数据库可能写坏。
- 原因：Dockerfile 用 shell 形式 `CMD nginx -g "daemon off;"`，实际执行 `sh -c "nginx ..."`，PID 1 是 sh 而非 nginx。sh 不转发信号给子进程，nginx 收不到 SIGTERM，10 秒后 Docker 发 SIGKILL 强杀。
- 解决方案：用 exec 形式让应用直接成为 PID 1：
  ```dockerfile
  CMD ["nginx", "-g", "daemon off;"]
  CMD ["node", "server.js"]
  CMD ["java", "-jar", "app.jar"]
  ```
  若应用本身不处理信号（如 shell 脚本启动），用 `tini` 或 `dumb-init` 作为 init：
  ```dockerfile
  RUN apk add --no-cache tini
  ENTRYPOINT ["/sbin/tini", "--"]
  CMD ["node", "server.js"]
  ```
- 预防措施：所有启动命令用 exec 形式；用 `docker inspect -f '{{.State.Pid}}'` 验证 PID 1 是不是应用进程；`docker stop -t 30` 测试优雅退出耗时。

**陷阱6：`latest` 标签陷阱——部署了什么自己都不知道**
- 现象：生产环境 `docker pull myorg/app:latest` 后行为变了，但代码没改；回滚时发现不知道上一版是哪个 tag。
- 原因：`latest` 只是个普通标签名，谁后推就指向谁；不同 registry 的 `latest` 可能是完全不同的镜像；`docker pull` 默认用本地缓存，不会自动拉新 `latest`。
- 解决方案：生产镜像用"语义版本 + git sha"双标签（`1.2.3`、`git-abc1234`），部署清单写死具体 tag；`latest` 仅用于 dev 环境；CI/CD 中 `docker pull` 前先 `docker rmi myorg/app:latest` 或用 `--pull always`。
- 预防措施：K8s 部署 yaml 的 `image:` 字段禁止用 `latest`（用 OPA/Kyra 策略校验）；Git tag 与镜像 tag 一一对应；保留至少最近 10 个版本镜像以便回滚。

---

### 实践信号

#### 官方进阶文档
- **Dockerfile reference**：https://docs.docker.com/engine/reference/builder/ — 学习重点：每条指令的语义、shell/exec 形式区别、`COPY --from` 多阶段用法、`--mount` 各类型说明。这是 Dockerfile 的"语法手册"，遇到不确定的指令行为第一站查这里。
- **BuildKit / docker build 官方文档**：https://docs.docker.com/build/ — 学习重点：构建上下文、缓存策略（`--cache-from`/`--cache-to`）、多平台构建（`buildx`）、`RUN --mount` 高级用法、CI 集成。
- **Dockerfile best practices**：https://docs.docker.com/develop/develop-images/dockerfile_best-practices/ — 学习重点：指令顺序、层合并、`.dockerignore`、基础镜像选择、安全实践。
- **Multi-stage build**：https://docs.docker.com/build/building/multi-stage/ — 学习重点：`AS` 别名、`COPY --from`、`--target` 部分构建、外部镜像作为 stage。

#### 社区热议话题
- **"Alpine vs Slim vs Distroless：生产镜像到底选哪个"**：来源于 Reddit r/docker、Hacker News 周期性热帖。讨论要点：alpine 体积小但 musl 兼容性坑多；slim 兼容性好且体积可接受；distroless 安全性最佳但调试困难。共识：Java/Node/Python 生产优先 slim，Go 静态二进制用 distroless/scratch。
- **"BuildKit cache mount 在 CI 上不生效怎么办"**：来源于 GitHub Actions、GitLab CI 社区。讨论要点：CI Runner 每次新实例，本地 cache mount 不复用；解法用 `--cache-to type=gha`（GitHub Actions）或 `type=registry`（推到 registry 缓存）。
- **"Spring Boot 容器化分层最佳实践"**：来源于 Spring 官方博客与 Stack Overflow。讨论要点：`spring-boot:layertools` 把 jar 拆四层、`BOOT-LAYERS` 配置、与多阶段构建结合。

#### 动手验证
请完成以下实践任务：

1. **多阶段构建体积对比**：写一个 Go HTTP 服务（`main.go` 输出 "hello"），分别用单阶段（`FROM golang:1.23`）和多阶段（`FROM golang:1.23 AS builder` + `FROM scratch`）构建，用 `docker images` 对比体积差异。预期：单阶段 ~850MB，多阶段 ~15MB。再用 `dive` 工具查看每层内容，验证最终镜像无 Go 工具链。

2. **缓存优化验证**：准备一个 Node 项目（含 `package.json` 与 5 个依赖），按"先 COPY package.json、再 npm ci、最后 COPY 源码"的顺序写 Dockerfile。第一次构建记录耗时；修改 `index.js` 一行后第二次构建，用 `--progress=plain` 观察哪些层命中缓存（应只有最后两层重建）。再故意把 `COPY . .` 移到 `npm ci` 前面，重复实验，对比构建时间差异。

3. **secret mount 安全验证**：写一个 Dockerfile，分别用三种方式注入一个假 token：(a) `ARG TOKEN`；(b) `COPY .env`；(c) `RUN --mount=type=secret`。构建后对每个镜像运行 `docker history --no-trunc <image>` 和 `docker run --rm <image> env`，验证只有 secret mount 方式让 token 既不在 history 也不在运行时环境出现。

4. **BuildKit cache mount 跨构建复用**：写一个 Maven 项目 Dockerfile，用 `--mount=type=cache,target=/root/.m2`。第一次构建记录 `mvn dependency:go-offline` 耗时（约 60s）；删除 `target` 目录后第二次构建，验证该步从 60s 降到 <5s。再用 `--no-cache` 对比无缓存场景。

5. **多架构构建实战**：用 `docker buildx create --use` 启用多架构构建器，构建一个 `nginx:alpine` 基础的静态站点镜像，分别产出 `linux/amd64` 和 `linux/arm64`，推送到 Docker Hub。用 `docker buildx imagetools inspect <image>` 验证 manifest list 包含两个架构。

---

## 章节小结

本章是 Docker 实操的核心：Dockerfile 是镜像的"源代码"，掌握它意味着能从"用别人的镜像"升级为"造自己的镜像"。

**核心脉络**：
1. **指令语义**——FROM（起点）、RUN（构建期）、COPY/ADD（装文件）、CMD/ENTRYPOINT（启动）、ENV/ARG（变量）是六大基础指令，理解每条的执行时机与缓存行为是写好 Dockerfile 的前提。
2. **CMD vs ENTRYPOINT** 是最高频考点：CMD 可被覆盖、ENTRYPOINT 固定、组合用法是生产镜像标准；exec 形式是唯一能优雅退出的形式。
3. **多阶段构建** 是生产必备：把构建工具链与运行时分离，镜像体积可降一个数量级，同时减少攻击面。
4. **BuildKit** 把构建从"线性脚本"升级为"可缓存、可注入机密、可并行"的现代构建系统：cache mount 提速、secret mount 保安全、ssh mount 拉私有仓库。
5. **缓存机制** 是性能命门：指令顺序决定缓存命中率，"依赖清单先行、源码后行"是通用法则。
6. **基础镜像选择** 是工程权衡：alpine 小但有 musl 坑、slim 平衡、distroless 安全但难调试；Java/Node/Python 优先 slim，Go 用 distroless/scratch。

**写好 Dockerfile 的心智模型**：把每条指令看作"产生一个不可变层"，思考"这一层什么时候失效、失效后重建代价多大"，把变更频率低的放前面、高的放后面；把"构建期"和"运行期"严格区分——RUN 是构建期、CMD 是运行期；把"机密"和"代码"严格区分——机密用 secret mount、绝不进镜像层。

掌握本章后，你已具备独立容器化任意应用的能力。下一章将进入镜像管理——如何存储、分发、扫描这些构建产物。
