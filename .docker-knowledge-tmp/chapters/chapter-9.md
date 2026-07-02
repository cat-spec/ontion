## 第9章 镜像仓库与分发

### 核心知识点

> 镜像仓库是 Docker 镜像生命周期中的「物流中心」，承担镜像的存储、版本管理与分发职责。理解仓库的命名规则、认证体系、分发协议与安全机制，是构建企业级容器平台的基础。

**1. 镜像仓库（Registry）是什么**
- 概念解释：Registry 是一个实现了 Docker Registry HTTP API V2 的服务端程序，按 `repository`（仓库）为单位组织镜像，每个仓库下存放若干 `tag`（标签）对应的镜像层（layers）和清单（manifest）。
- 核心作用：集中存储镜像、提供 HTTP 接口供 `push/pull`、支持分层（layer）去重传输、支持鉴权与签名校验。
- 基本用法：最简部署只需一条命令
  ```bash
  docker run -d -p 5000:5000 --restart=always --name registry registry:2
  docker tag nginx:1.25 localhost:5000/nginx:1.25
  docker push localhost:5000/nginx:1.25
  ```
- 注意事项：默认数据存在容器内 `/var/lib/registry`，生产必须挂卷持久化；默认无认证、无 TLS，仅适合本地或内网。

**2. Docker Hub（公有仓库）**
- 概念解释：Docker 官方运营的公有 SaaS 仓库（`hub.docker.com`），是 `docker pull` 默认的 registry。
- 核心作用：镜像分发中心、官方镜像（Official Images）托管、自动构建（Autobuild，目前已迁移到 GitHub Actions 等方式）、Explore 浏览、Rate Limit 限速。
- 基本用法：
  ```bash
  docker login                       # 交互式登录，token 存于 ~/.docker/config.json
  docker push youruser/myapp:v1      # 推送到个人命名空间
  docker pull youruser/myapp:v1
  docker search nginx                # 搜索 Hub 上的镜像
  docker logout
  ```
- 注意事项：匿名拉取 100 次/6 小时、登录用户 200 次/6 小时（IP 维度）；2025 年起 Hub 进一步收紧免费账户的公共镜像拉取策略，企业建议用 PAT（Personal Access Token）替代密码。

**3. 私有 Registry（distribution 项目）**
- 概念解释：CNCF 毕业项目 `distribution/distribution`（即 `registry:2` 镜像）是官方开源的 Registry 参考实现，支持文件系统/S3/Azure/GCS 等后端存储。
- 核心作用：搭建企业内网仓库、对接对象存储、配合 Harbor/Nexus 等上层方案作为底层引擎。
- 基本用法：使用 YAML 配置文件自定义
  ```yaml
  # /etc/docker/registry/config.yml
  version: 0.1
  storage:
    filesystem:
      rootdirectory: /var/lib/registry
    delete:
      enabled: true
  http:
    addr: :5000
    tls:
      certificate: /certs/domain.crt
      key: /certs/domain.key
  auth:
    htpasswd:
      realm: basic-realm
      path: /auth/htpasswd
  ```
  ```bash
  docker run -d -p 5000:5000 --restart=always --name registry \
    -v /data/registry:/var/lib/registry \
    -v /etc/docker/registry/config.yml:/etc/docker/registry/config.yml \
    registry:2
  ```
- 注意事项：原生 distribution 不提供 Web UI、不提供权限分组、不提供漏洞扫描，需要 Harbor 等套件补齐企业能力。

**4. 镜像命名规则**
- 概念解释：完整镜像引用格式为 `registry/repo:tag` 或 `registry/namespace/repo:tag`，省略 `registry` 时默认 `docker.io`，省略 `tag` 时默认 `latest`，省略 `namespace` 时表示官方镜像。
- 核心作用：唯一定位一个镜像，避免不同来源同名镜像冲突。
- 命名拆解示例：
  | 镜像引用 | registry | namespace | repo | tag |
  |---|---|---|---|---|
  | `nginx` | docker.io | library（官方） | nginx | latest |
  | `nginx:1.25` | docker.io | library | nginx | 1.25 |
  | `youruser/myapp` | docker.io | youruser | myapp | latest |
  | `registry.example.com:5000/team/svc:v1` | registry.example.com:5000 | team | svc | v1 |
  | `gcr.io/google-containers/pause:3.9` | gcr.io | google-containers | pause | 3.9 |
- 注意事项：registry 字段含 `.` 或 `:` 即被认为是域名，否则会被当作 Docker Hub 命名空间；非 HTTPS 端口必须显式写端口号。

**5. docker login / logout / push / pull / search 命令族**
- `docker login <registry>` — 登录，凭据以 base64 存于 `~/.docker/config.json`；建议用 `--password-stdin` 从管道输入避免泄露到 shell history。
  ```bash
  echo "$PAT" | docker login -u youruser --password-stdin
  ```
- `docker logout <registry>` — 清除指定 registry 的凭据。
- `docker push <ref>` — 默认并行上传所有层，已存在层跳过；push 前必须先 `docker tag` 到目标 registry 命名空间。
- `docker pull <ref>` — 默认拉取 manifest + 所有缺失层；可指定 `--platform` 选择多架构镜像中的特定架构。
- `docker search <term>` — 仅搜索 Docker Hub 公共镜像，无法搜私有仓库；功能弱，生产建议直接用 Hub 网页或 API。
- 注意事项：Docker 25 默认使用 `credsStore` / `credHelpers` 管理凭据，建议为 ECR/GCR 等云仓库配置对应的 credential helper（如 `docker-credential-ecr-login`）。

**6. Tag 规范与版本管理**
- 概念解释：tag 是同一仓库下不同镜像版本的符号指针，可被覆盖、可重复指向不同 digest。
- 语义化版本（SemVer）建议：`1.25.3-alpine`、`v2.8.0`、`8.2-bookworm`，主版本/次版本/补丁号 + 变体。
- **latest 陷阱**：`latest` 不是「最新版」而是「最后一次 push 时未指定 tag 的默认标签」，存在漂移；线上严禁用 `latest` 部署。
- digest 固定：每个镜像由内容寻址的 sha256 摘要唯一标识
  ```bash
  docker pull nginx@sha256:6af79ae5de407283dcea8b00d5c37ace95441fd58a8b1d2aa1ed93f5511bb05c
  ```
  K8s 中推荐 `image: nginx@sha256:...`，彻底避免 tag 漂移。
- 注意事项：tag 不可变是约定俗成而非强制，部分仓库（如 Harbor）可开启「immutable tag」策略强制锁定。

**7. 多架构镜像（manifest list）**
- 概念解释：多架构镜像是一个特殊的 manifest list（OCI image index），其中包含若干子 manifest，每个指向特定 `os/arch/variant` 的镜像。客户端 `docker pull` 时会自动根据当前节点架构选择对应子镜像。
- 核心作用：一条 `nginx:latest` 引用可同时支持 x86 服务器、ARM Mac、树莓派，无需用户手动区分。
- manifest list 结构示意：
  ```json
  {
    "schemaVersion": 2,
    "mediaType": "application/vnd.docker.distribution.manifest.list.v2+json",
    "manifests": [
      { "mediaType": "...v2+json", "digest": "sha256:aaa...", "platform": { "os": "linux", "architecture": "amd64" } },
      { "mediaType": "...v2+json", "digest": "sha256:bbb...", "platform": { "os": "linux", "architecture": "arm64", "variant": "v8" } }
    ]
  }
  ```
- 基本用法：`docker buildx` 是构建多架构镜像的标准工具
  ```bash
  # 1. 创建并使用 builder（需要 binfmt 支持 cross-compile）
  docker run --privileged --rm tonistiigi/binfmt --install all
  docker buildx create --use --name multi-builder
  docker buildx inspect --bootstrap

  # 2. 一次构建多架构并直接推送到 registry
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t youruser/myapp:1.0.0 \
    --push \
    .
  ```
- 查看多架构信息：
  ```bash
  docker buildx imagetools inspect youruser/myapp:1.0.0
  docker manifest inspect nginx:latest
  ```
- 注意事项：
  - 多架构构建需要 Docker 19.03+ 与 buildx；Docker Desktop 默认集成，Linux 需 `apt install docker-buildx-plugin`。
  - `--load` 一次只能载入单架构镜像到本地 daemon；要同时入多架构必须 `--push`。
  - ARM 节点拉取 amd64 镜像会报 `no matching manifest`，需显式 `--platform=linux/amd64`（配合 QEMU 运行）。

**8. 镜像分发安全（TLS 与证书）**
- 概念解释：Registry 默认必须走 HTTPS（TLS），客户端校验证书链；HTTP 仅用于 localhost 调试。
- 三种典型场景：
  1. **正规 CA 证书**（推荐）：用 Let's Encrypt 签发，registry 直接用；客户端无需额外配置。
  2. **自签证书**：将自签 CA 证书放到 docker daemon 信任目录
     ```bash
     # 生成证书
     mkdir -p /certs && openssl req -newkey rsa:4096 -nodes -sha256 \
       -keyout /certs/domain.key -x509 -days 3650 \
       -out /certs/domain.crt -subj "/CN=registry.local" \
       -addext "subjectAltName=DNS:registry.local"

     # 把 CA 证书拷贝到 daemon 信任目录
     sudo cp /certs/domain.crt /etc/docker/certs.d/registry.local:5000/ca.crt
     sudo systemctl restart docker
     ```
  3. **insecure-registries**（不推荐生产）：明文 HTTP 或跳过证书校验
     ```json
     // /etc/docker/daemon.json
     { "insecure-registries": ["registry.local:5000"] }
     ```
- 注意事项：`insecure-registries` 对带 TLS 的 registry 无效（不能用于跳过自签 TLS 校验）；路径必须严格匹配 `host:port`；修改后必须重启 docker。

**9. 镜像签名（DCT / Notary / Cosign）**
- Docker Content Trust (DCT)：
  - 通过 `DOCKER_CONTENT_TRUST=1` 环境变量开启，push 时用 Notary 私钥签名 manifest，pull 时校验签名。
  - 基于 The Update Framework (TUF)，角色分 root/targets/snapshot/timestamp。
  ```bash
  export DOCKER_CONTENT_TRUST=1
  docker push youruser/myapp:1.0.0   # 自动签名
  docker pull youruser/myapp:1.0.0   # 自动校验，未签名镜像拉取失败
  ```
- Notary：DCT 的服务端实现，Docker Hub 内置；自建需部署 notary-server + notary-signer + MySQL。
- **Cosign**（推荐新项目使用）：
  - 来自 sigstore 项目，基于 OCI + 透明日志（Rekor）。
  - 签名作为独立 OCI 对象推送到同一仓库（`sha256-xxx.sig`），不修改原镜像。
  ```bash
  cosign generate-key-pair
  cosign sign --key cosign.key youruser/myapp:1.0.0
  cosign verify --key cosign.pub youruser/myapp:1.0.0
  ```
- 注意事项：DCT 与 Cosign 是两套独立体系，互不兼容；Cosign 支持 keyless（OIDC 短期签名）+ KMS（云密钥管理），更适配 GitOps 与 CI/CD。

**10. 私有仓库方案对比**
- **Docker Hub 私有仓库**：托管式，免费账户 1 个私有 repo，简单无运维，但受 Rate Limit 与国内网络影响。
- **distribution/registry:2**：纯底层引擎，无 UI，适合做上游缓存或被 Harbor 内嵌。
- **Harbor**（CNCF 毕业项目）：企业级完整方案，含 Web UI、RBAC、漏洞扫描（Trivy）、签名校验、复制（Replication）、配额、GC、Robot Account、OIDC，是目前私有仓库首选。
- **Sonatype Nexus**：通用制品库（Maven/npm/Docker），适合既有 Nexus 团队统一管理多类制品。
- **云厂商**：
  - 阿里云 ACR（企业版支持同步、P2P 加速、安全扫描）
  - AWS ECR（与 IAM 深度集成，按存储+流量计费）
  - Google Artifact Registry（取代 GCR，多区域、多格式）
  - 腾讯云 TCR（企业版支持复制与实例化）

**11. Harbor 核心特性**
- Web UI + 项目（Project）维度 RBAC：项目公开/私有、成员角色（项目管理员/开发人员/访客/受限访客）。
- 漏洞扫描：内置 Trivy（早期为 Clair），push 时按策略拦截 HIGH/CRITICAL 镜像。
- 镜像复制（Replication）：跨 Harbor 实例同步，支持 filter（repo/tag/label）与触发器，常用于跨地域容灾。
- GC（Garbage Collection）：删除 tag 不释放 blob，需在「停写」窗口执行 `docker-compose stop registry && harbor gc`；新版本支持在线 GC（无停机）。
- 其他：Robot Account（CI 拉取用）、ChartMuseum/Helm Chart 仓库（v2.6 起改为 OCI Artifact）、签名策略（Notary v2 / Cosign）、配额与 Tag 保留策略。

**12. 镜像拉取加速**
- **registry mirror**：客户端通过 `daemon.json` 配置国内镜像源，对 Docker Hub 镜像走代理拉取
  ```json
  {
    "registry-mirrors": [
      "https://docker.mirrors.ustc.edu.cn",
      "https://hub-mirror.c.163.com"
    ]
  }
  ```
- **代理缓存（pull-through cache）**：用 `registry:2` 起一个代理模式，命中本地即返回，未命中回源 Docker Hub 并缓存
  ```yaml
  # proxy.yml
  proxy:
    remoteurl: https://registry-1.docker.io
    username: youruser
    password: yourpat
  ```
  ```bash
  docker run -d -p 5000:5000 --restart=always --name proxy-registry \
    -v /data:/var/lib/registry \
    -v /etc/docker/registry/proxy.yml:/etc/docker/registry/config.yml \
    registry:2
  docker pull localhost:5000/library/nginx:latest
  ```
- 注意事项：mirror 仅对 `docker.io` 生效，对私有 registry 镜像无效；2024 年起国内多数 mirror 服务因政策变化时断时续，建议企业自建代理缓存或迁私有仓库。

---

### 章节题目（共 14 道）

#### 【面试题】

**Q1（中等）请详细描述 `docker push` 的完整流程。**
答：
1. 客户端对镜像各 layer 计算 sha256 摘要，向 registry 发起 `POST /v2/<name>/blobs/uploads/` 启动上传。
2. registry 返回 upload URL（含 `Location` 头与 `uuid`）。
3. 客户端对每个 layer 检查 `HEAD /v2/<name>/blobs/<digest>`，已存在则跳过，不存在则用 `PATCH`/`PUT` 单流或分块上传 blob。
4. 所有 layer 上传完成后，推送 manifest（`PUT /v2/<name>/manifests/<reference>`），manifest 中引用各 layer 的 digest。
5. registry 校验 manifest 引用的 blob 全部存在，返回 201 Created。
6. 若开启 DCT，客户端额外用 Notary 上传签名 metadata。
考点：blob 上传机制、layer 去重、manifest 引用关系、DCT 与 push 的耦合。

**Q2（较难）多架构镜像的原理是什么？buildx 是如何实现「一次构建多架构」的？**
答：
- 多架构镜像在 registry 侧是一个 **manifest list**（mediaType `application/vnd.docker.distribution.manifest.list.v2+json`），包含若干子 manifest，每个绑定一个 `platform`（os/arch/variant）。
- `docker pull` 时客户端上报当前 OS/Arch，registry 返回匹配的子 manifest；找不到则报 `no matching manifest`。
- `buildx` 实现机制：
  1. 通过 binfmt_misc 在宿主机注册 QEMU 解释器，让 amd64 主机能执行 arm64 二进制（cross-compile via emulation）。
  2. 对每个 `--platform` 调用一次 BuildKit，分别产出对应架构的镜像（每个架构有独立的 layer digest）。
  3. 将所有子 manifest 聚合成 manifest list，`--push` 时一次性 PUT 到 registry。
  4. `--load` 受限于本地 daemon 单架构能力，不能载入 manifest list，所以多架构必须 `--push`。
考点：manifest list 数据结构、binfmt+QEMU、buildx 与 BuildKit 的关系、`--load` 限制。

#### 【论坛题】

**Q3（来源 StackOverflow 高票）自签证书的 registry，push 报 `x509: certificate signed by unknown authority`，如何修复？**
答：
1. 确认 registry 主机名与证书 CN/SAN 一致。
2. 将自签 CA 证书（注意是 CA，不是服务端证书本身）拷贝到客户端 docker daemon 信任目录：
   ```bash
   sudo mkdir -p /etc/docker/certs.d/registry.local:5000
   sudo cp ca.crt /etc/docker/certs.d/registry.local:5000/ca.crt
   sudo systemctl restart docker
   ```
3. macOS Docker Desktop：在 Settings → Resources → Proxies/Certificates 或直接放进 `~/.docker/certs.d/` 后重启 Docker Desktop。
4. ⚠️ 不要试图用 `insecure-registries` 来跳过 TLS 校验——它对 HTTPS registry 无效，只能用于明文 HTTP。
考点：证书信任目录命名规则、insecure-registries 的真实语义。

**Q4（来源 GitHub issue / Harbor 论坛）Harbor 推送大镜像（>5GB）经常超时或失败，怎么办？**
答：
1. 客户端：在 `daemon.json` 调大 `max-concurrent-uploads`（默认 5）、增大 upload 超时
   ```json
   { "max-concurrent-uploads": 10 }
   ```
2. Harbor/registry 侧：调大 nginx `client_max_body_size`、`proxy_request_buffering off`、`proxy_read_timeout 600s`。
3. registry 配置 `http.timeout` 与 storage 分块上传 chunk size。
4. 网络层：检查 MTU，避免分片重组丢包；建议在同 VPC 内推送。
5. 终极方案：拆分镜像（multi-stage 减小最终镜像）、用 `docker save | gzip | split` 离线分发。
考点：upload 路径上的瓶颈点（client/nginx/registry/网络）、分层上传参数。

#### 【期末题/认证题】

**Q5（DCA 认证风格）下列哪个命令在推送镜像到 `registry.example.com:5000/team/app:v1` 之前是必需的？**
A. `docker save registry.example.com:5000/team/app:v1`
B. `docker tag app:v1 registry.example.com:5000/team/app:v1`
C. `docker commit registry.example.com:5000/team/app:v1`
D. `docker build registry.example.com:5000/team/app:v1`

答：B。push 前必须用 `docker tag` 把本地镜像引用名改成包含目标 registry 的完整引用。
考点：镜像引用名与 push 目标的对应关系。

**Q6（期末题）关于 `insecure-registries`，下列说法正确的是？**
A. 可以用于跳过自签 TLS 证书的校验
B. 仅对明文 HTTP registry 生效，且必须 host:port 完全匹配
C. 配置后无需重启 docker 即可生效
D. 适用于 Docker Hub 镜像加速

答：B。`insecure-registries` 让 daemon 接受明文 HTTP，不会跳过 TLS 校验；配置后必须重启 docker。
考点：insecure-registries 的语义边界。

#### 【官网题】

**Q7（来源 Docker Hub docs）Docker Hub 的拉取限速（Rate Limit）规则是什么？如何规避？**
答：以 IP 为维度，匿名用户 100 次/6 小时、登录用户 200 次/6 小时（pull manifest 请求计数）。规避方案：
1. 登录 Hub 提升到 200 次。
2. 升级到 Pro/Team 账户解除限制。
3. 使用 registry mirror / pull-through cache。
4. 关键镜像迁到自建 Harbor 或云厂商 ACR/ECR。
5. 用 `docker manifest inspect` 而非 `docker pull` 仅查看元数据不计入 pull。
考点：限速维度（IP 而非账户）、规避手段优先级。

**Q8（来源 registry docs）`registry:2` 配置 `delete.enabled: true` 后，删除 tag 是否立即释放存储？为什么？**
答：不会。`DELETE /v2/<name>/manifests/<digest>` 仅删除 manifest 引用，blob 仍在存储后端。必须额外执行 **Garbage Collection**：
```bash
docker stop registry
docker run --rm -v /data/registry:/var/lib/registry registry:2 garbage-collect /etc/docker/registry/config.yml
docker start registry
```
Harbor 在 GC 前还需停掉 registry（旧版本），新版本支持在线 GC。
考点：manifest 删除 vs blob 删除、GC 必须在停写状态下运行。

#### 【实战题】

**Q9（实战）公司要从 Docker Hub 迁移到自建 Harbor，设计迁移方案。**
答：
1. **部署 Harbor**（见下方场景1），配置 OIDC + LDAP 集成企业身份。
2. **批量导出** Hub 镜像列表（用 Hub API），用脚本 `docker pull → docker tag → docker push` 到 Harbor。
3. **更优解**：用 Harbor 的 **Replication** 功能，新建规则源 = Docker Hub（pull-through 模式），目标 = 本地项目，支持 filter（namespace/tag 正则）与定时触发，自动同步并保留 digest。
4. **验证**：随机抽检 digest 一致性 `docker manifest inspect`。
5. **切换**：CI/CD 改写镜像引用；K8s 集群配置 `imagePullSecret`；保留 1 个月双写窗口回滚。
6. **下线 Hub 依赖**：关闭匿名拉取、配置 Rate Limit 监控。
考点：Harbor Replication、digest 一致性、灰度切换。

**Q10（实战）在 GitHub Actions 中构建多架构镜像并签名推送到 GHCR，给出 workflow 关键片段。**
答：
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write   # cosign keyless 必需
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-qemu-action@v3
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ghcr.io/${{ github.repository }}:v1.0.0
          provenance: true
          sbom: true
      - uses: sigstore/cosign-installer@v3
      - run: |
          cosign sign --yes \
            ghcr.io/${{ github.repository }}@${{ steps.build-push.outputs.digest }}
```
考点：buildx + QEMU、GHCR 认证、Cosign keyless（OIDC）签名、provenance/SBOM。

**Q11（论坛题，来源 Reddit r/docker）`docker pull` 报 `toomanyrequests: You have reached your pull rate limit`，但服务在 K8s 集群，怎么定位？**
答：
1. 限速按**出口 IP** 计算，K8s 集群所有节点可能共用一个 NAT 出口 IP，因此节点越多越早被限速。
2. 检查所有节点是否都配置了 `docker login`（Hub 登录用户从 100 提升到 200）。
3. 配置 `registry-mirrors` 走国内/第三方镜像源。
4. 长期方案：部署 Harbor pull-through cache（回源 Hub 并缓存），所有节点从 Harbor 拉。
5. 紧急方案：用 `image: nginx@sha256:...` digest 固定，配合 `imagePullPolicy: IfNotPresent` 减少重复拉取。
考点：Rate Limit 计费维度、集群共享出口 IP、缓存与镜像本地化。

**Q12（认证题）关于 manifest list，下列描述错误的是？**
A. 一个 manifest list 可包含 linux/amd64 与 linux/arm64 两个子 manifest
B. `docker pull` 会根据客户端架构自动选择子 manifest
C. manifest list 的 mediaType 是 `application/vnd.docker.image.index.v1+json`（OCI 等价）
D. manifest list 中每个子 manifest 必须共享同一组 layer digest

答：D。每个架构的镜像层是完全独立的，digest 各不相同；manifest list 仅是把它们打包引用。
考点：manifest list 与 layer 的关系。

**Q13（面试题）Docker Content Trust 与 Cosign 的主要区别？企业该选哪个？**
答：
| 维度 | DCT (Notary v1) | Cosign (sigstore) |
|---|---|---|
| 签名存储 | Notary 独立服务 + MySQL | OCI registry 内 sig tag |
| 镜像修改 | 不可，签名独立 | 不修改原镜像 |
| 密钥管理 | 本地/PCA | KMS/Keyless(OIDC)/HSM |
| 透明日志 | 无 | Rekor |
| 与 OCI 兼容 | 弱（依赖 Notary） | 强 |
| 维护状态 | Notary v1 已停更，v2 进行中 | 活跃 |
企业新项目推荐 Cosign；存量 Hub 镜像用 DCT 验证。
考点：签名存储位置、Keyless、Rekor、维护状态。

**Q14（实战）K8s 集群需要拉取私有 Harbor 镜像，配置步骤？**
答：
1. 在 Harbor 创建 Robot Account 或用户，获得用户名+token。
2. 生成 K8s secret：
   ```bash
   kubectl create secret docker-registry harbor-secret \
     --docker-server=harbor.example.com \
     --docker-username='robot$ci' \
     --docker-password=<token> \
     --docker-email=ci@example.com
   ```
3. Pod/Deployment 中引用：
   ```yaml
   spec:
     imagePullSecrets:
     - name: harbor-secret
     containers:
     - image: harbor.example.com/team/app:v1.0.0
   ```
4. 若 Harbor 自签证书，还需在每个节点放 ca.crt 到 `/etc/docker/certs.d/harbor.example.com/ca.crt`，或配置 containerd 的 `certs.d` 目录。
考点：imagePullSecret、Robot Account、节点证书分发。

---

### 项目常用场景

**场景1：企业私有 Harbor 部署（HTTPS + LDAP + 漏洞拦截）**
- 背景：公司镜像都在 Docker Hub，受 Rate Limit 与合规影响，需自建企业级私有仓库。
- 解决方案：
  ```bash
  # 1. 下载 Harbor 离线包
  wget https://github.com/goharbor/harbor/releases/download/v2.11.0/harbor-offline-installer-v2.11.0.tgz
  tar xzf harbor-offline-installer-v2.11.0.tgz && cd harbor

  # 2. 修改 harbor.yml
  # hostname: harbor.example.com
  # http.port: 80
  # https.port: 443
  # https.certificate: /certs/harbor.crt
  # https.private_key: /certs/harbor.key
  # harbor_admin_password: <strong>
  # database.password: <strong>
  # data_volume: /data/harbor
  # trivy.ignore_unfixed: false

  # 3. 安装（含 Trivy）
  ./install.sh --with-trivy

  # 4. 启用 LDAP：UI → Configuration → Authentication → LDAP
  #    配 url: ldap://ldap.example.com, search dn, filter (uid=...)
  ```
- 配置项目漏洞拦截策略：项目 → 配置 → 漏洞扫描策略：「阻止具有漏洞等级为 HIGH 或 CRITICAL 的镜像被 pull」。
- 最佳实践：
  - 用云对象存储做后端（S3/OSS）避免本地磁盘瓶颈。
  - 开启 Replication 到异地 Harbor 实现容灾。
  - Robot Account 给 CI，配最小权限（仅 push 到指定项目）。
  - 定期 GC + Tag 保留策略（保留近 10 个 tag，自动清理旧版）。

**场景2：多架构镜像构建推送（amd64 + arm64）**
- 背景：服务需要同时部署到 x86 服务器集群和 ARM Mac 开发机 / AWS Graviton 集群。
- 解决方案：
  ```bash
  # 1. 准备 Dockerfile（必须支持多架构，用 ARG TARGETPLATFORM）
  # Dockerfile
  FROM --platform=$BUILDPLATFORM golang:1.22 AS builder
  ARG TARGETOS TARGETARCH TARGETPLATFORM
  WORKDIR /src
  COPY . .
  RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o app ./cmd

  FROM alpine:3.19
  COPY --from=builder /src/app /usr/local/bin/app
  ENTRYPOINT ["/usr/local/bin/app"]

  # 2. 准备 builder
  docker run --privileged --rm tonistiigi/binfmt --install arm64
  docker buildx create --use --name multi --driver docker-container

  # 3. 多架构构建 + 推送（单条命令）
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t harbor.example.com/team/app:1.2.3 \
    -t harbor.example.com/team/app:latest \
    --push \
    .

  # 4. 验证
  docker buildx imagetools inspect harbor.example.com/team/app:1.2.3
  ```
- 最佳实践：
  - `FROM --platform=$BUILDPLATFORM` 让编译工具链在原生架构运行（更快的交叉编译），最终镜像用 `TARGETPLATFORM`。
  - 务必给镜像打 `--attest type=provenance` 与 `--attest type=sbom`。
  - CI 中固定 builder 名并缓存 `--cache-from type=gha`。
  - 拉取验证用 `--platform` 显式指定架构，避免拉错。

**场景3：CI 推送到云仓库（阿里云 ACR + 多区域同步）**
- 背景：业务部署在国内多 region K8s 集群，需要就近拉取镜像。
- 解决方案：
  ```yaml
  # .github/workflows/build.yml
  jobs:
    build-push:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: docker/setup-buildx-action@v3
        - name: Login to ACR
          uses: docker/login-action@v3
          with:
            registry: registry.cn-hangzhou.aliyuncs.com
            username: ${{ secrets.ACR_USER }}
            password: ${{ secrets.ACR_PAT }}
        - name: Build and push
          uses: docker/build-push-action@v5
          with:
            push: true
            platforms: linux/amd64,linux/arm64
            tags: |
              registry.cn-hangzhou.aliyuncs.com/namespace/app:${{ github.sha }}
              registry.cn-hangzhou.aliyuncs.com/namespace/app:latest
            cache-from: type=registry,ref=registry.cn-hangzhou.aliyuncs.com/namespace/app:cache
            cache-to: type=registry,ref=registry.cn-hangzhou.aliyuncs.com/namespace/app:cache,mode=max
  ```
- 跨区域同步：在 ACR 企业版配置「镜像同步」规则，从杭州实例同步到北京、上海实例；或用 Harbor Replication。
- 最佳实践：
  - 用 `github.sha` 做 tag，可追溯；附加 `latest` 给 dev 环境。
  - cache-from/to 跨 CI 运行加速，节省 60%+ 构建时间。
  - 用 credential helper 替代明文 login：`config.json` 中 `"credHelpers": {"registry.cn-hangzhou.aliyuncs.com": "acr-credential-helper"}`。
  - 部署端配 K8s `imagePullSecrets`，ACR 企业版走 VPC 内网域名避免公网流量费。

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|---|---|---|---|
| Docker Hub（公有 SaaS） | 私有 Registry（自建） | Hub 由 Docker 公司运营，账号体系是 Hub 用户；私有 Registry 是 distribution 引擎或 Harbor 等套件，自己运维、自己管账号、无 Rate Limit | 个人/开源项目用 Hub；企业生产、合规、跨地域同步用 Harbor |
| registry | repository | registry 是服务（host:port）；repository 是 registry 内某个镜像名（namespace/app），一个 repository 下有多个 tag | 「`docker.io/library/nginx`」中 `docker.io` 是 registry，`library/nginx` 是 repository |
| tag | digest | tag 是可变符号指针，可重复指向不同 digest；digest 是内容寻址的 sha256 摘要，永久唯一 | 开发用 tag 方便；生产 K8s 用 `image@sha256:...` 锁定不可变 |
| Docker Hub Official Image | Docker Hub Verified Publisher / Docker-Sponsored OSS | Official Image 由 Docker 维护「library」命名空间，无 namespace 前缀；Verified Publisher 是企业认证发布者（如 microsoft、bitnami）；Sponsored OSS 是 Docker 赞助的开源项目 | 找基础镜像优先 Official（如 nginx/redis）；企业产品用 Verified Publisher 验真 |
| Docker Content Trust (DCT) | Cosign | DCT 用 Notary v1 独立服务存签名，已停更；Cosign 把签名作为 OCI 对象存于同一仓库，支持 Keyless 与 Rekor 透明日志 | 新项目选 Cosign；老镜像 Hub 默认 DCT |
| registry mirror | pull-through cache | mirror 是客户端代理，仅对 docker.io 生效，命中即返回；pull-through cache 是服务端代理，可缓存任意 registry，未命中回源并落盘 | 个人/小团队用 mirror；企业用 pull-through cache 自建加速层 |
| Harbor Replication | docker pull/push | Replication 是服务端到服务端同步，无需经过客户端 daemon；push 是客户端到 registry 上传 | 跨地域容灾、跨仓库迁移用 Replication；本地构建用 push |

---

### 常见陷阱与坑点

**陷阱1：`latest` 漂移导致线上故障**
- 现象：相同 `image: app:latest`，今天部署正常，明天重建 Pod 后报错。
- 原因：`latest` 被新 push 覆盖指向另一个 digest，K8s 拉到了新镜像（依赖了新 API/旧 schema）。
- 解决：立即回滚到上一个已知 digest `kubectl set image deploy/app app=registry/app@sha256:<old>`。
- 预防：K8s 部署一律用 `image@sha256:...`；CI 输出 digest 并写入 GitOps 仓库；仓库启用 immutable tag。

**陷阱2：自签证书 push 失败 `x509: certificate signed by unknown authority`**
- 现象：`curl` 加 `-k` 能通，`docker push` 报 x509 错误。
- 原因：docker daemon 有独立的证书信任库，不读系统 CA bundle；且 `insecure-registries` 仅用于明文 HTTP，不能跳过 TLS 校验。
- 解决：把 CA 证书放到 `/etc/docker/certs.d/<host:port>/ca.crt` 并重启 docker；macOS Docker Desktop 走 Settings 注入或 `~/.docker/certs.d/`。
- 预防：生产 registry 一律使用正规 CA（Let's Encrypt 免费足够）；测试环境用 mkcert 统一签发。

**陷阱3：配置 `insecure-registries` 后不生效**
- 现象：daemon.json 写了 `insecure-registries: ["registry.local"]`，但 pull 仍走 HTTPS 报错。
- 原因：
  1. 端口不匹配——配置写 `registry.local` 实际访问 `registry.local:5000`，必须严格匹配。
  2. 没重启 docker。
  3. 配置目标是 HTTPS registry——`insecure-registries` 仅对 HTTP 生效，不会降级 HTTPS。
- 解决：检查 `daemon.json` 中字符串与实际引用完全一致（含端口），重启 docker。
- 预防：永远不用 `insecure-registries`，要么上 TLS 要么走 localhost。

**陷阱4：推送大镜像超时 / 失败**
- 现象：5GB+ 镜像 push 到一半报 `EOF` / `context deadline exceeded`。
- 原因：链路上 nginx/CDN/registry 任何一处的超时或 body size 限制。
- 解决：
  - 客户端 `daemon.json`：`"max-concurrent-uploads": 10`、`"shutdown-timeout": 60`。
  - Harbor nginx：`client_max_body_size 0; proxy_request_buffering off; proxy_read_timeout 900s;`。
  - registry：`http.debug.addr: :5001` 看上传日志；考虑 `storage.cache.blobdescriptor: inmemory`。
  - 网络层：检查 MTU（云上常 1500，跨 region tunnel 可能 1400），用 `ping -M do -s 1472` 验证。
- 预防：multi-stage 减小最终镜像；按业务拆分镜像；推送走同 VPC 内网。

**陷阱5：删除 tag 不释放存储**
- 现象：Harbor 删除了 100 个旧 tag，磁盘占用几乎没变。
- 原因：DELETE 只删 manifest，blob 仍存在并被其他 manifest 引用；必须 GC 才释放。
- 解决：Harbor 管理 → GC，旧版本需先停 registry；新版本支持在线 GC。
- 预防：开启 Tag 保留策略自动清理；定期 GC；Harbor 2.x 启用在线 GC。

**陷阱6：registry mirror 配置后 Hub 镜像仍走原始 registry**
- 现象：`daemon.json` 配了 mirror，但 `docker pull nginx` 还是慢、还是被限速。
- 原因：
  1. 镜像引用包含完整 registry 域名（如 `docker.io/library/nginx`），某些情况下 mirror 不生效。
  2. mirror 服务端本身限速或挂了。
  3. 没重启 docker。
- 解决：`docker info` 检查 Registry Mirrors 是否生效；`docker pull` 时观察网络请求；切换 mirror 源。
- 预防：部署自建 pull-through cache 而非依赖第三方 mirror。

---

### 实践信号

#### 官方进阶文档
- Docker Registry 官方文档（distribution 项目）：https://docs.docker.com/registry/
- Docker Hub 官方帮助（账号、Rate Limit、PAT、自动构建）：https://docs.docker.com/docker-hub/
- Docker buildx 多架构构建指南：https://docs.docker.com/build/building/multi-platform/
- Docker Content Trust 文档：https://docs.docker.com/engine/security/trust/
- Harbor 官方文档：https://goharbor.io/docs/

#### 社区热议话题
- **Harbor vs Nexus**：Harbor 容器原生、扫描与复制功能强；Nexus 通用制品库，适合 Maven/npm/Helm/Docker 一站式。Reddit r/devops 与 GitHub Discussions 长期讨论，共识是「容器为主选 Harbor，多格式混合选 Nexus」。
- **Docker Hub 限速与国内 mirror 失效**：2024 年起多所高校与企业 mirror 服务停止公开，社区讨论迁私有仓库 + pull-through cache 方案；sigstore/Cosign 在 SBOM 与供应链安全方向讨论度上升。
- **Cosign vs Notary v2**：CNCF 供应链安全 SIG 持续讨论，趋势是 Cosign（sigstore）成为事实标准，Notary v2 仍在迭代但生态落后。

#### 动手验证
1. **本地部署 registry:2 并推拉镜像**（30 分钟）
   ```bash
   docker run -d -p 5000:5000 --restart=always --name registry registry:2
   docker pull nginx:alpine
   docker tag nginx:alpine localhost:5000/mynginx:alpine
   docker push localhost:5000/mynginx:alpine
   docker pull localhost:5000/mynginx:alpine
   curl http://localhost:5000/v2/_catalog
   curl http://localhost:5000/v2/mynginx/tags/list
   ```
2. **用 buildx 构建多架构镜像并 inspect**（45 分钟）
   ```bash
   docker run --privileged --rm tonistiigi/binfmt --install arm64
   docker buildx create --use --name multi
   docker buildx build --platform linux/amd64,linux/arm64 \
     -t localhost:5000/multiapp:v1 --push .
   docker buildx imagetools inspect localhost:5000/multiapp:v1
   # 观察 manifest list 中两个 platform 子 manifest 的 digest 不同
   ```
3. **部署 Harbor 并配置复制规则**（90 分钟，建议 2 核 4G+ VM）：按场景1步骤，再用 Replication 从 Docker Hub 同步 `library/nginx`、`library/redis` 到本地项目，验证 digest 一致。
4. **用 Cosign 给镜像签名并验证**（30 分钟）：参考 sigstore 官方 quickstart，用 keyless 模式在 GitHub Actions 中签名，本地 `cosign verify --certificate-identity=... --certificate-oidc-issuer=...` 校验。

---

## 章节小结

本章围绕「镜像如何被存储、命名、传输、校验」展开：
- **存储与命名**：Registry 按 repository + tag + digest 组织镜像，命名规则中 registry/namespace/tag 的省略约定是初学者第一道坎。
- **公有 vs 私有**：Docker Hub 适合开源与个人，企业应自建 Harbor 等方案，distribution/registry:2 是它们的底层引擎。
- **多架构与分发**：manifest list 是多架构镜像的核心数据结构，buildx + QEMU 让单机构建多架构成为可能，`--push` 是唯一能落盘 manifest list 的方式。
- **安全**：HTTPS + CA 信任是基础，DCT/Notary 是早期签名方案，Cosign（sigstore）是当下推荐，配合 Rekor 透明日志实现供应链可验证。
- **加速与稳定**：registry mirror 与 pull-through cache 应对 Hub 限速，Harbor Replication 应对跨地域分发，GC 与 Tag 保留策略应对存储膨胀。
- **生产建议**：线上镜像一律 digest 固定、Tag 不可变、关键镜像签名校验、私有仓库走 VPC 内网、定期 GC 与备份。

掌握本章后，你应能独立完成企业私有仓库选型部署、多架构镜像构建分发、CI/CD 镜像签名推送、跨地域同步与加速，并能定位 push/pull 链路上的各类安全与性能问题。
