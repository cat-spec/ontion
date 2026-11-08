# AI Infra 下一阶段路线

更新：2026-11-08。原始学习目录保持只读；新项目建议放在当前工作区内。

## 路线判断

现有学习顺序总体正确，但知识点之间缺少工程闭环：

1. 已写过 CUDA/Triton、FlashAttention、DP/FSDP/TP/PP、3D demo、nano-vLLM 阅读和 profiler。
2. 现有 3D 并行是教学 demo，缺少真实模型、单卡数值基线、分布式 checkpoint、性能对比和故障诊断。
3. 算子已有 vector add、softmax、normalization、dropout、GEMM/FlashAttention 尝试；主要问题不是文件数量，而是缺少边界测试、梯度检查、性能模型和集成使用。
4. 性能分析基础较薄，下一阶段每项实现都必须经过“正确性 → 计时 → profiler → 优化 → 回归”五步。

## 主项目：Distributed Training Performance Lab

目标：以一个小型 decoder-only Transformer 为对象，完成从单卡基线到 PyTorch 原生分布式训练，再到性能定位和一项算子优化的闭环。

### 项目最小范围

- 模型：4–8 层 decoder-only Transformer，可用合成 token 数据启动；模型结构固定，保证不同并行方案可比较。
- 训练路径：单卡 → DDP → FSDP2 → TP；有足够 GPU 时再加入 PP 和 3D 组合。
- 工程能力：配置、日志、结构化指标、随机种子、checkpoint 保存/恢复、异常退出后的基本恢复验证。
- 性能指标：step time、tokens/s、峰值 allocated/reserved 显存、计算/通信/数据等待时间；硬件信息与配置随实验保存。
- 正确性门槛：单卡与各分布式方案前若干步的 loss、关键梯度和更新后参数在合理误差内对齐。
- 产物：可复现命令、实验表、profiler trace、瓶颈结论、一次优化前后对比。

### GPU 数量分支

| 环境 | 本周完成范围 |
|---|---|
| 1 GPU | 单卡基线、算子集成、profiler、checkpoint；分布式逻辑用 CPU/Gloo 冒烟 |
| 2 GPU | 加 DDP、FSDP2、2-way TP，并完成数值/吞吐/显存对照 |
| 4 GPU | 加 2×2 的 TP+DP 或 PP+DP，对照通信与气泡 |
| 8 GPU | 在前述方案通过后验证 2×2×2 3D 并行，不把它作为第一天的起点 |

## 下周七天执行计划

### Day 1：建立单卡基线

- 从现有 Transformer 经验重新搭建最小 decoder-only 模型，保留清晰的 block 边界。
- 固定 seed、dtype、batch、sequence length、optimizer 和数据。
- 保存前 5–10 step 的 loss、关键梯度摘要、step time 和峰值显存。
- 验收：相同配置重复运行时，结果可复现；计时只包含明确标注的区间。

### Day 2：DDP 与性能基线

- 接入 DDP，确认 sampler/每 rank 数据划分与 global batch 定义。
- 对齐单卡等效 global batch，验证 loss 和参数更新。
- 记录 DDP 吞吐、显存、通信时间与 scaling efficiency。
- 验收：能解释 AllReduce 在反向中的位置，并用 trace 指出通信是否与计算重叠。

### Day 3：FSDP2

- 对同一模型接入 FSDP2，明确 wrap 粒度和 `reshard_after_forward`。
- 记录参数、梯度、优化器状态和激活的显存变化。
- 与 DDP 比较：显存节省、额外通信、吞吐变化。
- 验收：checkpoint 保存后可恢复，并继续至少 2 step；恢复前后的 loss 连续。

### Day 4：TP

- 对 attention/MLP 的 Linear 使用列并行与行并行；画出每层输入、权重、局部输出形状和通信点。
- 与单卡参考对齐 forward、loss、grad。
- 验收：能从 trace 找到对应 collective，并解释它为何出现在该位置。

### Day 5：PP 或组合并行

- 资源足够时加入两段 PP，分别测试 2、4、8 个 microbatch。
- 比较 bubble、激活显存和吞吐；4 GPU 可组合 DP+TP 或 DP+PP。
- 8 GPU 且前面均通过时，再接入现有 2×2×2 思路。
- 验收：给出 microbatch 数量变化的实验表，而不是只给理论判断。

### Day 6：系统化性能分析

- 分离数据等待、H2D、forward、backward、optimizer、collective 和 checkpoint 时间。
- 使用 PyTorch profiler 先定位大段瓶颈；只对关键 kernel 再使用更细的 GPU 工具。
- 做一次受控实验：每次只改变一个变量，如 microbatch、FSDP reshard 或 TP degree。
- 验收：输出一页结论，包括证据、瓶颈、候选优化、预期与实测差异。

### Day 7：算子集成与项目收尾

- 完成一个 Triton RMSNorm，或 fused residual + RMSNorm；接入模型作为可切换实现。
- 对比 PyTorch reference：forward、不同 shape/dtype、非 2 次幂长度、极值、非连续输入；若实现 backward，再做梯度对照。
- 预热、多次同步计时，分别报告 kernel 与端到端训练收益。
- 验收：即使 kernel 更快但训练没有变快，也要能够解释原因。

## 算子学习路线

算子路线按“机制覆盖”选题，不按文件数量堆积：

1. **RMSNorm**：归约、数值精度、mask、memory-bound、融合。
2. **Fused residual + RMSNorm**：理解减少 HBM 读写与端到端收益。
3. **GEMM**：tiling、shared memory、寄存器、Tensor Core、计算受限；建立可靠基线后再追性能。
4. **Cross Entropy 或 fused linear + CE**：大词表、在线归约、避免完整 logits 中间量。
5. **FlashAttention**：等前四项的测试和性能流程成熟后，重新实现 forward，再做 backward；先修正 LSE、mask、尾块和 stride 问题。

每个算子的固定验收模板：

- Reference：PyTorch 正确实现。
- Correctness：随机、边界、极值、不同 dtype/shape/stride。
- Backward：需要训练时做梯度对照。
- Benchmark：预热、同步、多次重复、报告波动；区分 kernel 和端到端时间。
- Analysis：计算字节量/算术强度，说明预期瓶颈，再用 profiler 证实或推翻。
- Integration：至少在真实模型 block 中替换一次，记录端到端收益。

## 后续四周路线

### 第 1 周：训练闭环

完成上述 Distributed Training Performance Lab 的最小版本。重点是正确性和测量方法。

### 第 2 周：可靠性与性能回归

加入 distributed checkpoint、resume、实验配置管理、性能回归阈值；补进程异常、OOM、collective hang 的基本诊断。

### 第 3 周：推理项目

围绕 nano-vLLM 做独立实验：prefill/decode、KV block 分配、continuous batching、TTFT/TPOT、吞吐、P50/P95；改变并发和 token budget，分析调度取舍。

### 第 4 周：算子与框架集成

完善 RMSNorm/fused op 和 GEMM；学习 PyTorch custom op、autograd、dispatcher/CUDA extension，把自定义算子注册并接入训练项目。

## 当前暂缓项

- 大范围 K8s、复杂平台建设：等训练/推理程序产生真实部署需求后再补。
- 同时重写完整 Megatron、DeepSpeed 或 vLLM：先用小项目形成可验证能力，再阅读和改动大型框架。
- 直接继续扩展当前 FlashAttention backward：先建立算子测试框架，并修复 forward 的 LSE、mask、尾块和 stride 基础问题。

## 项目完成定义

项目是否“大型”不以代码行数判断。满足以下条件才算完成：

1. 单卡与分布式结果有数值对照。
2. 至少两种并行策略有吞吐、显存和通信证据。
3. checkpoint 能恢复。
4. profiler 结论能够解释一个真实瓶颈。
5. 至少一个自定义算子通过测试并接入模型。
6. README 能让另一台同类机器复现实验。
