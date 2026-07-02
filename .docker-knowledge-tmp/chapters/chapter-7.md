## 第7章 网络配置与多容器通信

### 核心知识点

> Docker 网络是容器化部署中仅次于存储的"硬骨头"。理解 CNM 三要素（Sandbox/Endpoint/Network）、各驱动的隔离粒度与流量路径、iptables DNAT 端口映射原理、自定义 bridge 自带 DNS 的解析机制，是写出可跨主机、可调试、可安全对外暴露服务的前提。本章把默认 bridge 与自定义 bridge 的差异、host/none/container 三种特殊模式、overlay 跨主机通信、端口映射底层原理一次性讲透。

**1. Docker 网络模型：CNM（Container Network Model）**
- 概念解释：CNM 是 Docker 提出的容器网络规范，由三个核心对象构成：
  - **Sandbox**：容器的网络栈（网络命名空间），含接口、路由表、DNS 配置，对应一个容器的 network namespace。
  - **Endpoint**：Sandbox 接入网络的"插头"，一个 Endpoint 只属于一个 Sandbox 和一个 Network，本质是 veth pair 的一端。
  - **Network**：一组可互相通信的 Endpoint 集合，由特定驱动（bridge/overlay/macvlan…）实现。
- 核心作用：把"容器网络配置"和"具体实现驱动"解耦，驱动只要实现 CNM 接口即可插拔。
- libnetwork：CNM 的 Go 实现库，负责驱动注册、Endpoint 绑定、Service Discovery 等，Docker daemon 通过它调用网络能力。
- IPAM（IP Address Management）：IP 地址分配子系统，每个网络驱动可指定 IPAM Driver（默认 `default`），负责子网划分、网关、地址池分配。`docker network create --subnet=10.20.0.0/16 --ip-range=10.20.1.0/24` 即调用 IPAM。
- 基本查询：
  ```bash
  docker network ls                       # 列出所有网络
  docker network inspect bridge           # 查看 IPAM、Driver、Containers
  docker info | grep -A2 "Network:"       # 查看 libnetwork 版本
  ```
- 注意事项：
  - 同一容器可同时接入多个网络（多 Endpoint），但每个网络中只能有一个 Endpoint。
  - 自定义 IPAM Driver（如 `nullipam`、Calico/Weave 的 IPAM）常被 K8s CNI 之外的纯 Docker 场景使用。

**2. 内置网络驱动一览**
- Docker 25.x 内置 7 种驱动，行为差异巨大：

| 驱动 | 跨主机 | 隔离级别 | 典型用途 |
|------|--------|----------|----------|
| `bridge` | 否 | 命名空间 + NAT | 单机默认，最常用 |
| `host` | 否 | 无隔离（共享主机栈） | 极致性能、调试 |
| `none` | 否 | 仅 lo | 离线计算、安全沙箱 |
| `container` | 否 | 共享另一容器栈 | Sidecar、调试 |
| `overlay` | 是 | VXLAN 封装 | Swarm 多主机通信 |
| `macvlan` | 是（L2） | 容器有独立 MAC | 让容器直接出现在物理网络 |
| `ipvlan` | 是（L2/L3） | 共享 MAC，不同 IP | 避免 MAC 地址表膨胀 |

- 注意事项：
  - `macvlan` 需要物理网卡开启混杂模式（promiscuous mode），且与主机通信默认不通（防环路），需另建 macvlan bridge。
  - `ipvlan` 解决 macvlan 在某些交换机限制 MAC 数量的问题，但要求上游交换机允许同一 MAC 多 IP。
  - `overlay` 在非 Swarm 模式下创建会被拒绝：`Error response from daemon: overlay networks are only supported for Swarm mode`。

**3. 默认 bridge 网络（docker0）**
- 概念解释：Docker 安装后自动创建名为 `bridge` 的默认网络，驱动为 `bridge`，背后是 Linux bridge `docker0`（172.17.0.1/16）。
- 流量路径：
  - 容器→容器：通过 veth pair 接入 docker0，二层互通，但**默认 bridge 没有 DNS**，只能用 IP 通信。
  - 容器→外网：经过 docker0 → NAT（POSTROUTING 链 MASQUERADE）→ 主机网卡出网。
  - 外网→容器：必须通过 `-p` 端口映射，触发 DNAT。
- iptables 规则（核心，常被忽略）：
  ```bash
  sudo iptables -t nat -L POSTROUTING -n -v   # MASQUERADE 出网
  sudo iptables -t nat -L DOCKER -n -v        # DNAT 端口映射
  sudo iptables -L DOCKER -n -v               # FORWARD 链隔离
  ```
- 注意事项：
  - 默认 bridge 上所有容器在同一子网，**没有网络隔离**，任意容器可用 IP 访问其他容器。
  - 容器名/主机名在默认 bridge 上无法解析，这是从默认 bridge 迁到自定义 bridge 的最主要原因。

**4. 自定义 bridge 网络（重点：DNS 差异）**
- 概念解释：通过 `docker network create -d bridge mynet` 创建的 bridge，独立网段、独立 iptables 规则、**内置 DNS 解析（127.0.0.11）**。
- 核心差异（默认 bridge vs 自定义 bridge）：

| 维度 | 默认 bridge | 自定义 bridge |
|------|-------------|---------------|
| DNS 解析容器名 | ❌ 不支持 | ✅ 自动支持 |
| 网络隔离 | 所有容器互通 | 仅同网络内互通 |
| `--link` 兼容 | 需用 `--link` | 推荐用 DNS，弃用 `--link` |
| 子网/网关 | 固定 172.17.0.0/16 | 可自定义 |
| 推荐用途 | 临时调试 | 生产推荐 |

- 基本用法：
  ```bash
  docker network create -d bridge \
    --subnet 10.10.0.0/24 \
    --gateway 10.10.0.1 \
    appnet

  docker run -d --name web --network appnet nginx:1.25
  docker run -d --name db  --network appnet mysql:8

  # 在 web 容器内可直接 ping db 解析
  docker exec web ping -c2 db
  ```
- DNS 服务器：自定义 bridge 容器内 `/etc/resolv.conf` 中 `nameserver 127.0.0.11`，由 dockerd 内嵌 DNS 转发，未命中的查询转发到宿主机 DNS。
- 注意事项：
  - 容器**重命名**或**重建**后，DNS 自动更新，业务用容器名访问天然支持滚动升级。
  - 同一容器可接入多个自定义 bridge，DNS 解析时按网络命名空间生效。

**5. host 网络模式**
- 概念解释：`--network host` 让容器直接复用主机网络命名空间，无 veth、无 NAT、无端口映射。
- 性能：省去 bridge 转发和 NAT，吞吐与延迟接近裸机，适合高吞吐 UDP/Redis/监控 agent。
- 端口冲突：容器监听的端口等于占用主机端口，多个容器抢同一端口会失败。
  ```bash
  docker run --network host nginx:1.25    # 直接占用主机 80
  # 若主机已有 nginx，则容器启动失败：bind: address already in use
  ```
- 注意事项：
  - host 模式下 `-p` 参数被**静默忽略**，不会报错，初学者易误以为端口映射生效。
  - 安全性最差：容器可看到主机所有网卡、路由、监听端口，仅用于可信镜像。
  - macOS/Windows Desktop 的 host 模式行为不同：实际是 VM 网络栈而非真主机，端口也仅在 VM 内有效，Linux 上才是真 host 模式。

**6. none 网络模式**
- 概念解释：`--network none` 容器只有 lo 接口，无任何外部网络访问。
- 用途：
  - 离线计算（编译、加密计算）防数据外泄。
  - 安全沙箱（分析恶意样本）。
  - 需要自定义网络栈时先 none 再手工 `ip link` 配置。
- 基本用法：
  ```bash
  docker run --network none alpine sh -c "ip a"
  # 仅显示 lo，无 eth0
  ```
- 注意事项：none 容器仍可与主机通过文件（volume）交互，真正隔离需配合 `--cap-drop=ALL --read-only`。

**7. container 网络模式（共享网络栈）**
- 概念解释：`--network container:<name|id>` 让新容器复用目标容器的 network namespace，二者共享网卡、IP、端口表。
- 典型场景：
  - Sidecar 模式：日志/监控 agent 与主应用共享 localhost。
  - 调试：用一个带 netstat/curl 的工具容器接入业务容器网络排查问题。
  ```bash
  docker run -d --name app --network appnet nginx:1.25
  docker run -it --rm --network container:app nicolaka/netshoot
  # 在 netshoot 内 curl http://localhost 即访问 app 的 80
  ```
- 注意事项：
  - 共享方不能再通过 `-p` 声明端口（端口已被目标容器占用），且不能与 `--network` 的其他值并用。
  - 目标容器停止后，共享方容器的网络随之失效。
  - 容器间不共享文件系统、PID，仅网络栈。

**8. overlay 网络（跨主机通信）**
- 概念解释：overlay 驱动基于 VXLAN（默认 VXLAN UDP 4789）在物理网络之上构建二层虚拟网络，让不同主机上的容器像在同一子网。
- 前提：必须先 `docker swarm init`（或在双栈上启用 `--overlay` 集群模式），overlay 网络才能创建。
- 工作原理：
  - 每个 overlay 网络有唯一 VXLAN ID（VNI）。
  - 容器发出的以太网帧在主机被封装为 VXLAN UDP 包，发往目标主机解封装。
  - 控制平面通过 Serf/Gossip 同步容器 IP↔主机映射。
- 基本用法：
  ```bash
  docker swarm init
  docker network create -d overlay --attachable myoverlay
  docker service create --name web --network myoverlay nginx:1.25
  # --attachable 允许普通容器（非 service）接入，便于调试
  docker run -it --rm --network myoverlay nicolaka/netshoot
  ```
- 注意事项：
  - overlay 网络的 DNS 解析对**服务名**（service）和**容器名**均生效，Swarm 内置 VIP 负载均衡。
  - 跨主机 overlay 性能略低于 host/bridge（VXLAN 封装开销），对延迟敏感场景慎用。
  - 端口映射在 overlay 上由 Swarm 的 `--publish mode=host|ingress` 控制，ingress 模式通过 routing mesh 在任意节点可达。

**9. 端口映射原理（iptables DNAT）**
- 概念解释：`-p [主机IP:]主机端口:容器端口[/协议]` 在主机 iptables 的 `nat` 表 `DOCKER` 链添加 DNAT 规则，将流入主机的流量改写到容器 IP:容器端口。
- 命令变体：
  ```bash
  docker run -p 8080:80      nginx      # 所有主机 IP:8080 → 容器:80
  docker run -p 127.0.0.1:8080:80 nginx # 仅本机访问
  docker run -p 8080:80/tcp  nginx      # 显式 tcp（默认）
  docker run -p 8600:53/udp  bind       # UDP 端口
  docker run -P              nginx      # 随机映射到 49000-49900 主机端口
  docker port web            # 查看映射
  ```
- 底层规则（`-p 8080:80`）：
  ```
  -t nat -A DOCKER ! -i docker0 -p tcp -m tcp --dport 8080 \
    -j DNAT --to-destination 172.17.0.2:80
  -A DOCKER -d 172.17.0.2/32 ! -i docker0 -o docker0 -p tcp --dport 80 \
    -j ACCEPT
  ```
- 注意事项：
  - 端口映射在默认 bridge 和自定义 bridge 上均生效；host 模式下被忽略。
  - 主机端口被占用时容器**启动失败**：`bind: address already in use`，需先 `lsof -i:8080` 排查。
  - `-P` 随机端口范围由 `/proc/sys/net/ipv4/ip_local_port_range` 控制，Docker 默认 49000-49900，可用 `--ip-range` 不影响。
  - Docker 25 默认使用 `nftables` 后端（若系统支持），但 `iptables` 命令仍兼容可见。

**10. DNS 解析与 network-alias**
- 概念解释：自定义 bridge 与 overlay 网络内置 DNS（127.0.0.11），自动将容器名解析为容器 IP；`--network-alias` 可为容器在同一网络中追加额外别名。
- 基本用法：
  ```bash
  docker run -d --name api --network appnet --network-alias api.local myapi
  docker run -d --name api-v2 --network appnet --network-alias api.local myapi:v2
  # 同一别名对应多个容器时，DNS 返回多 IP（轮询负载均衡）
  docker run -it --rm --network appnet alpine nslookup api.local
  ```
- 解析优先级：容器内 `/etc/hosts` > 内嵌 DNS（容器名/别名）> 上游 DNS。
- 注意事项：
  - 别名仅在声明的 network 内生效，跨网络不互通。
  - 同名别名多容器，DNS 返回全部 IP，客户端做轮询；若需健康感知负载均衡请用 Swarm service 或 Traefik。
  - 默认 bridge 上 `--network-alias` **无效**，因为没有内嵌 DNS。

**11. docker network 管理命令全集**
- `docker network ls`：列出网络（DRIVER、SCOPE 为 local/swarm）。
- `docker network inspect <name>`：查看 IPAM、Options、Containers、Labels。
- `docker network create [-d bridge] [--subnet …] [--gateway …] [--ip-range …] [--attachable] name`。
- `docker network connect <net> <container>`：把已运行容器接入另一网络（不停机）。
- `docker network disconnect <net> <container>`：移除接入。
- `docker network rm <name>`：删除（必须无容器接入）。
- `docker network prune`：清理所有未使用的自定义网络。
- 注意事项：
  - 默认 3 个网络（bridge/host/none）不可删除。
  - `connect` 时可指定 `--alias`、`--ip`、`--ip6`，用于多网络场景。

**12. 容器间通信实战：Web + DB 多容器**
- 完整示例（自定义 bridge + DNS）：
  ```bash
  docker network create appnet

  docker run -d --name db \
    -e MYSQL_ROOT_PASSWORD=secret \
    --network appnet \
    mysql:8

  docker run -d --name web \
    -e DATABASE_HOST=db \
    -e DATABASE_PORT=3306 \
    -p 8080:80 \
    --network appnet \
    mywebapp:1.0

  # web 内通过 db:3306 直接连数据库，无需 IP
  docker exec web sh -c "nc -zv db 3306"
  ```
- 最佳实践：
  - 永远用自定义 bridge 而非默认 bridge。
  - 用 `--restart unless-stopped` 保证依赖自愈。
  - 多容器复杂依赖用 Docker Compose（自动创建网络、按依赖启动）。
  - 数据库不暴露端口到主机，仅网络内访问。

---

### 章节题目

#### 【面试题】

**题1（高频）**：默认 bridge 和自定义 bridge 有什么区别？生产环境应该用哪个？
- 答案：
  1. 默认 bridge 即 docker0（172.17.0.0/16），所有未指定网络的容器默认接入；自定义 bridge 由用户 `docker network create` 创建。
  2. 默认 bridge **没有内嵌 DNS**，容器之间只能用 IP 通信（或 `--link`，已废弃）；自定义 bridge 自动支持容器名解析（nameserver 127.0.0.11）。
  3. 默认 bridge 上所有容器互相可见，缺乏隔离；自定义 bridge 间默认隔离，需 `connect` 才能互通。
  4. 默认 bridge 不支持每网络独立 MTU/子网配置；自定义 bridge 可精细化配置。
  5. 生产环境**必须用自定义 bridge**，便于服务发现、安全隔离、滚动升级。
- 考点：DNS 差异、隔离性、生产实践。难度：★★★。

**题2**：Docker 容器间通信有哪几种方式？分别适用于什么场景？
- 答案：
  1. **同自定义 bridge**：容器名 DNS 解析，最常用，适合单机多容器。
  2. **默认 bridge + IP**：无 DNS，仅调试用。
  3. **host 模式**：共享主机栈，用 localhost 通信，性能最优但无隔离。
  4. **container 模式**：共享另一容器栈，sidecar/调试。
  5. **overlay 网络**：Swarm 跨主机，service 名解析 + VIP LB。
  6. **端口映射 + 主机网络回环**：容器 A 通过 `主机IP:映射端口` 访问容器 B，性能差，不推荐。
  7. **macvlan/ipvlan**：容器直接接入物理网络，二层互通。
- 考点：网络驱动全景、场景选型。难度：★★★★。

**题3**：`-p 8080:80` 在底层做了什么？为什么 host 网络模式下 `-p` 不生效？
- 答案：
  - `-p 8080:80` 在 iptables `nat` 表 `DOCKER` 链添加 DNAT 规则，把流入主机 8080 的 TCP 流量目标地址改写为容器 IP:80；同时在 `filter` 表 `DOCKER` 链放行到容器 80 的流量。
  - host 模式下容器直接复用主机 network namespace，没有独立的容器 IP/网卡，DNAT 无对象可改写，因此 `-p` 被 dockerd 静默忽略（不报错但不生效）。
- 考点：iptables DNAT、host 模式本质。难度：★★★★。

#### 【论坛题】

**题4**（来源：Stack Overflow 高赞问答 #51506868）：两个容器都在默认 bridge 上，为什么 `ping 容器名` 失败？
- 现象：`docker run --name web nginx`、`docker run --name db mysql`，在 web 内 `ping db` 报 `bad address`。
- 原因：默认 bridge 不带内嵌 DNS，容器名无法解析，`/etc/resolv.conf` 指向的是宿主机 DNS 而非 127.0.0.11。
- 解决方案：创建自定义 bridge 并把两个容器接入：
  ```bash
  docker network create appnet
  docker network connect appnet web
  docker network connect appnet db
  docker exec web ping -c2 db
  ```
- 考点：默认 bridge 无 DNS。难度：★★。

**题5**（来源：GitHub moby/moby issue #32676）：`docker run -p 80:80` 报 `bind: address already in use`，但 `docker ps` 没有任何占用 80 的容器。
- 原因：占用 80 端口的可能是**宿主机进程**（如本机 nginx、apache）或**已停止但未释放的容器**，也可能是上次容器异常退出后 docker-proxy 残留。
- 排查：
  ```bash
  sudo lsof -i:80
  sudo ss -lntp | grep :80
  ps aux | grep docker-proxy
  ```
- 解决：停掉宿主机 nginx，或改用其他端口 `docker run -p 8080:80`，或 `docker rm -f` 残留容器。
- 预防：端口规划文档化，避免主机服务与容器端口冲突。
- 考点：端口占用排查、docker-proxy。难度：★★★。

#### 【期末题/认证题】

**题6**（DCA 认证真题改编）：下列关于 Docker 网络驱动的说法，正确的是？
A. 默认 bridge 网络支持容器名 DNS 解析
B. host 模式下 `-p` 参数被忽略
C. overlay 网络可在非 Swarm 模式下创建
D. macvlan 容器与宿主机默认可直接通信

- 答案：**B**。
  - A 错：默认 bridge 无 DNS。
  - C 错：overlay 必须先 `docker swarm init`。
  - D 错：macvlan 容器与宿主机默认不通（防环路），需另建 macvlan 接入宿主机。
- 考点：网络驱动特性辨析。难度：★★。

**题7**：使用 `docker network create -d bridge --subnet 192.168.10.0/24 prod` 创建网络后，下列哪个命令可以让运行中的容器 `web` 接入 `prod` 网络且不断开现有网络？
A. `docker run --network prod web`
B. `docker network connect prod web`
C. `docker network attach prod web`
D. `docker run --network-add prod web`

- 答案：**B**。`docker network connect` 可在不停机情况下把容器接入额外网络；A/C/D 不是有效语法或会重建容器。
- 考点：动态接入网络。难度：★★。

#### 【官网题】

**题8**（来源 https://docs.docker.com/network/bridge/）：根据官方文档，自定义 bridge 相比默认 bridge 提供了哪些优势？至少列出 4 点。
- 答案（官方列举）：
  1. **自动 DNS 解析**：自定义 bridge 自动提供容器名到 IP 的解析，默认 bridge 不支持。
  2. **更好的隔离**：不同自定义 bridge 之间默认不互通，安全更高。
  3. **每网络独立配置**：可单独设置 MTU、subnet、gateway、ICMP rate。
  4. **容器热接入**：运行中容器可 `network connect` 接入，无需重启。
  5. **默认关闭对外访问**：自定义 bridge 上容器默认不暴露端口，必须显式 `-p`。
- 考点：官方推荐最佳实践。难度：★★。

**题9**（来源 https://docs.docker.com/network/overlay/）：overlay 网络的 `--attachable` 选项作用是什么？为什么生产环境要谨慎使用？
- 答案：
  - `--attachable` 允许**普通容器**（非 Swarm service）通过 `--network myoverlay` 接入 overlay 网络，主要用于调试和需要自定义编排的场景。
  - 谨慎使用原因：
    1. 普通容器不享受 Swarm service 的健康检查与自动重调度，节点故障后无法自愈。
    2. 任意节点上的容器接入会绕过 service 的副本控制，难以审计。
    3. 普通容器的 IP 由 IPAM 分配但不被 routing mesh 识别，外部访问不可达。
  - 推荐做法：仅在临时调试时用 `--attachable`，正式服务一律用 `docker service create`。
- 考点：overlay attachable、Swarm 编排。难度：★★★★。

#### 【实战题】

**题10**（项目场景）：微服务架构有 3 个服务：`gateway`(8080)、`user-service`(8081)、`order-service`(8082)，需要在单机上部署并实现：①服务间通过容器名互访；②仅 gateway 对外暴露；②数据库 `mysql` 仅内部可达。请给出完整命令。
- 解决方案：
  ```bash
  # 1. 创建隔离网络
  docker network create -d bridge --subnet 10.30.0.0/24 microsvc

  # 2. 数据库（不暴露端口）
  docker run -d --name mysql \
    -e MYSQL_ROOT_PASSWORD=secret \
    --network microsvc \
    --restart unless-stopped \
    mysql:8

  # 3. user-service（仅内部）
  docker run -d --name user-service \
    -e DB_HOST=mysql \
    --network microsvc \
    --restart unless-stopped \
    myuser:1.0

  # 4. order-service（仅内部）
  docker run -d --name order-service \
    -e DB_HOST=mysql \
    -e USER_SERVICE=http://user-service:8081 \
    --network microsvc \
    --restart unless-stopped \
    myorder:1.0

  # 5. gateway（对外 8080）
  docker run -d --name gateway \
    -e USER_SERVICE=http://user-service:8081 \
    -e ORDER_SERVICE=http://order-service:8082 \
    -p 8080:8080 \
    --network microsvc \
    --restart unless-stopped \
    mygateway:1.0

  # 验证：gateway 内 curl user-service:8081/health 应成功
  docker exec gateway curl -s user-service:8081/health
  ```
- 考点：自定义 bridge、DNS、最小暴露面、依赖编排。难度：★★★★。

**题11**（项目场景）：3 台主机 A/B/C，每台部署一个 Nginx，要求任意一台上 `curl http://web` 都能负载均衡到三台 Nginx。给出 Swarm overlay 方案。
- 解决方案：
  ```bash
  # A 节点初始化 Swarm
  docker swarm init --advertise-addr <A_IP>
  # 拿到 token 后在 B、C 执行
  docker swarm join --token <token> <A_IP>:2377

  # 创建 overlay 网络
  docker network create -d overlay webnet

  # 创建 service（3 副本，自动 VIP + DNS RR）
  docker service create --name web --replicas 3 \
    --network webnet -p 80:80 nginx:1.25

  # 在任意节点上用 overlay 网络创建调试容器
  docker run -it --rm --network webnet alpine sh -c "apk add curl && for i in 1 2 3 4; do curl -s web | hostname; done"
  ```
- 关键点：Swarm service 名 `web` 自动具备 VIP 负载均衡，跨节点访问由 routing mesh 处理。
- 考点：overlay、service、routing mesh、VIP。难度：★★★★★。

**题12**：用 `container` 网络模式实现 sidecar：主容器 `app` 监听 8080，sidecar 容器 `logger` 通过共享网络栈抓取 `app` 的 8080 流量日志。给出命令与原理。
- 解决方案：
  ```bash
  docker run -d --name app --network appnet myapp:1.0
  docker run -d --name logger --network container:app \
    -v /var/log/app:/var/log mylogger:1.0
  ```
- 原理：`logger` 复用 `app` 的 network namespace，二者 localhost:8080 完全等同；logger 用 tcpdump/ngrep 抓 lo 上的流量即可。
- 注意事项：logger 不能再声明 `-p`，否则冲突报错；logger 退出不影响 app，但 app 退出会带走 logger 的网络。
- 考点：container 模式、sidecar。难度：★★★。

---

### 项目常用场景

**场景1：Web 应用 + 数据库多容器通信（最经典）**
- 背景：单体 Web 需连 MySQL，要求不暴露 MySQL 到主机，且 Web 重启后仍能用容器名连库。
- 解决方案：
  ```bash
  docker network create blognet

  docker run -d --name mysql \
    -e MYSQL_ROOT_PASSWORD=pwd \
    -e MYSQL_DATABASE=blog \
    --network blognet \
    --restart unless-stopped \
    -v mysql_data:/var/lib/mysql \
    mysql:8

  docker run -d --name blog \
    -e DB_HOST=mysql -e DB_USER=root -e DB_PASSWORD=pwd -e DB_NAME=blog \
    -p 80:80 \
    --network blognet \
    --restart unless-stopped \
    wordpress:php8.2-apache
  ```
- 最佳实践：
  - 数据库不带 `-p`，仅网络内可达，最小暴露面。
  - 用 named volume 持久化数据。
  - 应用通过容器名 `mysql` 访问，重建数据库容器 IP 变化也不影响。
  - 用 `--restart unless-stopped` 让依赖自愈；启动顺序由 `depends_on`（Compose）或重试逻辑保证。

**场景2：跨主机 overlay 部署微服务集群**
- 背景：3 节点集群，前端 web 需访问后端 api，要求任意节点宕机服务仍可用。
- 解决方案：
  ```bash
  # 节点1：初始化
  docker swarm init --advertise-addr 10.0.0.11
  # 节点2/3：加入
  docker swarm join --token <token> 10.0.0.11:2377

  # 创建 overlay 网络
  docker network create -d overlay appnet

  # 后端 api（3 副本）
  docker service create --name api --replicas 3 \
    --network appnet myapi:1.0

  # 前端 web（2 副本，对外 80）
  docker service create --name web --replicas 2 \
    --network appnet -p 80:80 myweb:1.0

  # 任意节点 curl http://web 自动路由到某 web 副本
  # web 内 curl http://api 自动 RR 到 3 个 api 副本
  ```
- 最佳实践：
  - service 名作为稳定 DNS，副本变化对调用方透明。
  - 用 `--constraint node.labels==xxx` 控制副本分布。
  - 数据库服务用 `--mount type=volume` + `--constraint` 固定到带数据的节点，或用外部 DB。

**场景3：容器访问宿主机服务（常见坑点）**
- 背景：宿主机跑了一个 Redis 6379，容器内应用需访问，但 `localhost:6379` 不通。
- 原因：容器有独立 network namespace，localhost 指容器自身。
- 解决方案（按推荐顺序）：
  1. **用 `host.docker.internal`**（Desktop 默认支持，Linux 需 `--add-host=host.docker.internal:host-gateway`）：
     ```bash
     docker run -e REDIS_HOST=host.docker.internal \
       --add-host=host.docker.internal:host-gateway \
       myapp:1.0
     ```
  2. **用宿主机 docker0 网关 IP**（Linux，172.17.0.1）：
     ```bash
     docker run -e REDIS_HOST=172.17.0.1 myapp:1.0
     # 同时确保宿主机 Redis 监听 0.0.0.0 或 172.17.0.1
     ```
  3. **host 模式**（不推荐，无隔离）：`docker run --network host myapp:1.0`。
  4. **把 Redis 也容器化**接入同一自定义 bridge（最推荐）。
- 注意事项：方案 2 在自定义 bridge 下网关 IP 不同（如 10.10.0.1），需 `docker network inspect` 确认。

**场景4：让容器拥有物理网络独立 IP（macvlan）**
- 背景：公司内网要求监控 agent 容器以独立 IP 出现在局域网，避免 NAT。
- 解决方案：
  ```bash
  # 创建 macvlan，绑定物理网卡 eth0
  docker network create -d macvlan \
    --subnet=192.168.1.0/24 \
    --gateway=192.168.1.1 \
    -o parent=eth0 macnet

  # 启动容器，分配独立 IP
  docker run -d --name monitor \
    --network macnet --ip 192.168.1.50 \
    --restart unless-stopped \
    prom/node-exporter

  # 解决容器与宿主机不通：在宿主机建 macvlan 子接口
  sudo ip link add macvlan0 link eth0 type macvlan mode bridge
  sudo ip addr add 192.168.1.250/32 dev macvlan0
  sudo ip link set macvlan0 up
  sudo ip route add 192.168.1.50 dev macvlan0
  ```
- 注意事项：
  - 物理网卡需开启 promiscuous mode：`sudo ip link set eth0 promisc on`。
  - 容器 IP 必须在物理网络中可用且不冲突。
  - 交换机若限制 MAC 数量，改用 ipvlan L2 模式。

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|----------|----------|
| 默认 bridge（docker0） | 自定义 bridge | 默认 bridge 无 DNS、所有容器互通、固定子网；自定义 bridge 有 DNS、网络间隔离、可自定义子网 | 调试用默认；生产一律自定义 |
| bridge 模式 | host 模式 | bridge 有独立 namespace + NAT；host 直接复用主机栈，无隔离无 NAT | bridge 隔离场景；host 高性能/调试 |
| bridge 模式 | overlay 模式 | bridge 仅单机二层；overlay 跨主机 VXLAN 封装，需 Swarm | 单机用 bridge；多机用 overlay |
| `-p 8080:80` | `-P` | 前者指定主机端口；后者随机映射到 49000-49900 | 固定端口用 -p；临时调试用 -P |
| 容器名 DNS | 容器 IP 通信 | DNS 跟随容器名，IP 重建会变；DNS 适合滚动升级，IP 适合静态 | 生产用 DNS；脚本调试用 IP |
| container 模式 | bridge 模式 | container 共享另一容器栈（localhost 互通）；bridge 各自独立栈 | container 做 sidecar；bridge 做隔离 |
| macvlan | ipvlan | macvlan 容器有独立 MAC；ipvlan 共享 MAC 仅 IP 不同 | 交换机允许多 MAC 用 macvlan；受限用 ipvlan |
| `--link`（已废弃） | 自定义 bridge DNS | `--link` 是默认 bridge 上的手动别名；DNS 是自动服务发现 | 历史代码兼容用 --link；新项目用 DNS |

---

### 常见陷阱与坑点

**陷阱1：默认 bridge 用容器名访问失败**
- 现象：容器 A、B 都在默认 bridge，A 内 `curl http://B:8080` 报 `curl: (6) Could not resolve host`。
- 原因：默认 bridge 没有内嵌 DNS（127.0.0.11），`/etc/resolv.conf` 指向宿主机 DNS，无法解析容器名。
- 解决方案：迁移到自定义 bridge：
  ```bash
  docker network create appnet
  docker network connect appnet A
  docker network connect appnet B
  ```
- 预防：新建容器直接 `--network appnet`，避免使用默认 bridge。

**陷阱2：容器互连用 localhost**
- 现象：两个容器在同一 bridge，A 内 `curl http://localhost:8080` 想访问 B 的 8080，结果访问到 A 自己。
- 原因：每个容器有独立 loopback，localhost 指容器自身。
- 解决方案：用容器名 `curl http://B:8080`；若必须用 localhost，则用 `--network container:B` 共享栈（sidecar 场景）。
- 预防：理解 network namespace 隔离，绝不在多容器场景用 localhost 互访。

**陷阱3：host 模式端口冲突难排查**
- 现象：`docker run --network host nginx` 启动失败 `bind: address already in use`，但 `docker ps -a` 看不到任何占用 80 的容器。
- 原因：host 模式下端口占用方是**宿主机进程**（如本机 nginx），与 Docker 无关，`docker ps` 当然看不到。
- 解决方案：
  ```bash
  sudo lsof -i:80
  sudo ss -lntp | grep :80
  # 停掉宿主机 nginx 或换端口
  ```
- 预防：host 模式前先排查主机端口占用；优先用 bridge + `-p`。

**陷阱4：`-P` 随机端口不知道映射到哪**
- 现象：`docker run -P nginx` 启动后无法访问，浏览器打开 80 不通。
- 原因：`-P`（大写）随机映射到主机 49000-49900，不是 80。
- 解决方案：
  ```bash
  docker port <container>          # 查看映射
  docker ps                        # PORTS 列显示 0.0.0.0:49155->80/tcp
  curl http://localhost:49155
  ```
- 预防：明确区分 `-p`（小写，指定端口）与 `-P`（大写，随机）；生产用 `-p` 固定端口。

**陷阱5：macvlan 容器与宿主机不通**
- 现象：用 macvlan 给容器分配了独立 IP，从局域网其他机器能 ping 通，但从宿主机 ping 不通。
- 原因：Linux 为防止环路与 MAC 漂移，默认禁止 macvlan 容器与宿主机直接通信。
- 解决方案：在宿主机创建一个 macvlan 子接口作为"桥梁"：
  ```bash
  sudo ip link add macvlan0 link eth0 type macvlan mode bridge
  sudo ip addr add 192.168.1.250/32 dev macvlan0
  sudo ip link set macvlan0 up
  sudo ip route add 192.168.1.50 dev macvlan0
  ```
- 预防：使用 macvlan 前评估是否真的需要宿主机↔容器互通，必要时改用 bridge。

**陷阱6：overlay 网络在非 Swarm 节点创建失败**
- 现象：单机环境 `docker network create -d overlay mynet` 报 `overlay networks are only supported for Swarm mode`。
- 原因：overlay 控制平面依赖 Swarm 的 Raft/Gossip 同步容器 IP↔主机映射，非 Swarm 模式下无法工作。
- 解决方案：先 `docker swarm init`（单节点也可成 swarm），再创建 overlay；或改用 bridge + 隧道（WireGuard/IPsec）手动实现跨主机。
- 预防：跨主机方案规划阶段确定是否走 Swarm；K8s 集群则用 CNI（Calico/Flannel）而非 overlay。

---

### 实践信号

#### 官方进阶文档
- Docker 网络概述（驱动全景）：https://docs.docker.com/network/
- Bridge 网络详解（含默认 vs 自定义）：https://docs.docker.com/network/bridge/
- Overlay 网络与 Swarm：https://docs.docker.com/network/overlay/
- macvlan 教程：https://docs.docker.com/network/network-tutorial-macvlan/
- iptables 与 Docker（含 nat 表/DOCKER 链说明）：https://docs.docker.com/network/packet-filtering-firewalls/

#### 社区热议话题
- Docker 默认 bridge 无 DNS 是否应废弃（GitHub moby/moby #19203）：开发者长期讨论是否在默认 bridge 也启用 DNS，权衡向后兼容与新手友好。
- host 网络模式在生产的安全性（Reddit r/docker、Docker Forums）：监控/高性能场景推荐 host，但安全团队反对，主流共识是仅在可信镜像下使用。
- bridge NAT 性能损耗（ServerFault、Stack Overflow）：NAT 对吞吐的影响约 5-15%，万兆网络下是否值得用 host 模式是热点。
- macOS Desktop 的 host 模式"假" host（GitHub docker/for-mac #5784）：因 Docker Desktop 在 VM 中运行，host 模式仅 VM 网络栈，与 Linux 行为不同，常被误用。

#### 动手验证
1. **验证默认 bridge 与自定义 bridge 的 DNS 差异**：
   ```bash
   docker run -d --name a1 alpine sleep 3600
   docker run -d --name a2 alpine sleep 3600
   docker exec a1 ping -c1 a2          # 失败：bad address

   docker network create testnet
   docker network connect testnet a1
   docker network connect testnet a2
   docker exec a1 ping -c1 a2          # 成功
   docker exec a1 cat /etc/resolv.conf # nameserver 127.0.0.11
   ```
2. **验证 `-p` 端口映射的 iptables DNAT 规则**：
   ```bash
   docker run -d --name web -p 8080:80 nginx
   sudo iptables -t nat -L DOCKER -n -v
   # 应看到 DNAT tcp dpt:8080 to:172.17.0.X:80
   sudo iptables -L DOCKER -n -v
   # 应看到 ACCEPT tcp dpt:80 到容器 IP
   docker rm -f web
   sudo iptables -t nat -L DOCKER -n -v   # 规则已被 dockerd 自动清理
   ```
3. **验证 container 模式共享 localhost**：
   ```bash
   docker run -d --name app --network appnet nginx
   docker run -it --rm --network container:app curlimages/curl curl -s http://localhost
   # 应返回 nginx 默认页面，证明 localhost 共享
   ```

---

## 章节小结
Docker 网络的核心在于理解 CNM 三层模型与各驱动的隔离粒度：默认 bridge 仅适合调试（无 DNS、所有容器互通），自定义 bridge 是生产标配（自动 DNS、网络隔离、热接入）；host/none/container 是三种特殊模式，分别对应性能/隔离/sidecar 场景；overlay 借助 VXLAN 实现跨主机通信，但依赖 Swarm。端口映射的底层是 iptables nat 表 DNAT，理解这一点能解决 90% 的"端口不通"问题。掌握容器名 DNS、network-alias、最小暴露面原则，即可构建出安全、可调试、可扩展的多容器通信架构。
