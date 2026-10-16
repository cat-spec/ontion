# V1
## 前向传播
设计思路，一个program处理一整个QKV
FlashAttention V1 依赖两个核心技术的组合：
1. **Tiling（分块）**：将 Q、K、V 切成小块，每次只加载一小块到 SRAM 中计算
2. **Online Softmax**：在不知道全局最大值的情况下，边加载新块边修正 Softmax 结果
### 核心代码 双循环
```python
外循环: for j = 1 to T_c (遍历 K/V 块)
    从 HBM 加载 K_j, V_j 到 SRAM
    内循环: for i = 1 to T_r (遍历 Q 块)
        从 HBM 加载 Q_i, O_i, m_i, l_i 到 SRAM
        计算局部注意力分数 S_ij = Q_i * K_j^T
        更新统计量和输出
        将更新后的 O_i, m_i, l_i 写回 HBM
```
### 缺点分析
1.如果batch，head数量太少，并发度上不来
2.除法操作太多，非GMEE操作过多
## 反向传播

## 自我检测
- 能解释标准 Attention 为什么是 Memory-Bound 而非 Compute-Bound
- 能手动推导 Online Softmax 的递推更新公式
- 能说明 Tiling 块大小 BrBr​、BcBc​ 如何根据 SRAM 容量确定
- 能描述 FlashAttention 前向传播中外循环和内循环各遍历什么
- 能解释为什么重计算策略不会让 wall-clock 时间变长
- 能推导 FlashAttention 的 HBM IO 复杂度为 O(N2d2/M)O(N2d2/M)
- 能用 Triton 或 CUDA 实现简化版 FlashAttention 前向 Kernel
- 能说明 FlashAttention V1 中外循环遍历 K/V 的局限性

# V2
设计思路，
1.一个program处理Q的多个行，无论什么情况都有并发度
2.外循环q内循环kv，只对o写入一次
3.减少除法指令，只在最后onlin softmax除一次
## 前向传播
```python
外循环: for i = 1 to T_r (遍历 Q 块) — 分配给不同 Thread Block
    从 HBM 加载 Q_i 到 SRAM（只加载一次）
    初始化 O_i = 0, m_i = -inf, l_i = 0
    内循环: for j = 1 to T_c (遍历 K/V 块)
        从 HBM 加载 K_j, V_j 到 SRAM
        计算 S_ij，更新统计量和 O_i（全在 SRAM 中）
    将最终 O_i 写回 HBM（只写一次）
```
## 反向传播
设计思路 
1.重计算，减少内存读写
2.分开求dq 和dkdv
### 自我检测
- 能解释 V2 为什么要把外循环从 K/V 改为 Q
- 能说明 V2 中 O 的 HBM 访问次数从 2Tc2Tc​ 降到 1 的原因
- 能描述 V2 的 Warp 分配策略及其相对于 V1 的优势
- 能推导延迟归一化的正确性（未归一化累积最终除以 ll 等价于每步归一化）
- 能画出 Causal Mask 下块级跳过的三种情况
- 能解释 logsumexp L=m+log⁡(l)L=m+log(l) 如何简化反向传播
- 能对比 V1 和 V2 在 A100 上的 TFLOPS 利用率差异
### 自我检测答案
```
1.
V2 将外循环从 K/V（键/值）改为 Q（查询），核心原因是**为了增加并行度并消除 Warp 间的通信开销**。
- **并行度不足**：在 V1 中，外循环是 K/V，内循环是 Q。由于 K/V 的所有块都需要与同一个 Q 块进行计算，因此不同的 Q 块之间是相互独立的，可以分配给不同的线程块（Thread Block）并行处理。但如果以 K/V 为外循环，多个线程块会同时写入同一个 Q 块的输出 `O`，产生写冲突，必须通过跨块的归约（reduce）来同步，这非常低效。
- **消除通信**：V2 将 Q 移至外循环，使得每个外循环迭代（即每个 Q 块）的计算完全独立，不依赖于其他 Q 块的结果。因此，这些迭代可以被分发到不同的线程块上并行执行，无需任何跨线程块的通信，显著提高了 GPU 的占用率。

2.
这里的 `Tc` 指的是 K/V 的块数量。`O` 的 HBM 访问次数减少，是因为 V2 通过**延迟归一化**，改变了输出矩阵 `O` 的更新方式。
在 V1 中，每处理一个 K/V 块，都需要对当前累积的输出 `O` 进行归一化（即除以当前的归一化因子 `l`）。这意味着，对于一个 Q 块，其输出 `O` 需要被从 HBM 中读出、修改、再写回，总共涉及 **2Tc** 次 HBM 访问（Tc 次读，Tc 次写）。
V2 观察到，每步的除法可以推迟到循环全部结束后再执行。在循环中，`O` 的累加器只进行必要的缩放修正，但不做除法。这样，`O` 在整个计算过程中**一直保留在片上 SRAM（或寄存器）中**，只在最后循环结束时，将最终结果**一次性写回 HBM**。因此，HBM 访问次数从 2Tc 次降为 **1 次**。

3.
延迟归一化的正确性可以从数学上简单推导。设最终输出为 `O`，标准注意力计算可表示为：
`O_i = (∑_j exp(S_ij) * V_j) / (∑_j exp(S_ij))`
其中 `S_ij` 是查询 `i` 和键 `j` 的注意力分数。如果我们将分子和分母分别累积，并**在最后才进行除法**，即：
`O_i = (∑_j exp(S_ij) * V_j) / l_i`，其中 `l_i = ∑_j exp(S_ij)`
由于 `l_i` 是一个与 `j` 无关的常数，因此**先求和再除以 `l_i`**，与**每步都除以当前累积的 `l_i`**，在数学上是完全等价的。FlashAttention 中的在线 softmax 算法正是基于这一原理，通过维护运行中的最大值和归一化因子，保证了数值稳定性，同时使得延迟归一化成为可能。

4.
在因果掩码（Causal Mask）下，注意力矩阵是下三角的。在块级计算时，根据 Q 块和 K 块的相对位置，可以分为三种情况：
1. **完全跳过（Fully Masked）**：当 Q 块的行索引 **完全大于** K 块的列索引时（即 Q 块的所有查询位置都在 K 块的所有键位置之后），该块对应的注意力分数全为 `-inf`，**可以直接跳过，不进行计算**。这可以节省近一半的矩阵乘计算量。
2. **部分掩码（Partial Mask）**：当 Q 块和 K 块**在对角线附近相交**时，需要**应用三角掩码**，只计算对角线及以下的部分，其余部分置为 `-inf`。  
3. **完全可见（Fully Visible）**：当 Q 块的行索引 **完全小于等于** K 块的列索引时（即 Q 块的所有查询位置都在 K 块的所有键位置之前或同时），该块**无需任何掩码**，正常进行完整计算。
   
```
# 数学公式

## online softmax
![[Pasted image 20261016113915.png]]
再次进行优化
![[Pasted image 20261016114038.png]]
具体实现
```python
# 更新行最大值  
    m_new = tl.maximum(m_i, tl.max(s, axis=-1))  
    # 修正因子 alpha = exp(m_old - m_new)    alpha = tl.exp(m_i - m_new)  
  
    # P 块 = exp(s - m_new)   
     p = tl.exp(s - m_new[:, None])  
    # 更新 l 和 acc    l_i = l_i * alpha + tl.sum(p, axis=-1)  
    acc = acc * alpha[:, None] + tl.dot(p.to(v.dtype), v)  
    m_i = m_new  
# 归一化得到 
Oo = acc / l_i[:, None]
```
## 反向传播
![[Pasted image 20261016114438.png]]
具体代码
```python
rowsum_dp = tl.sum(dp * p, axis=1)  # (BLOCK_M,)
ds = p * (dp - rowsum_dp[:, None])   # (BLOCK_M, BLOCK_N)
```
# 算子封装
```python
import torch

class MyFunction(torch.autograd.Function):
    @staticmethod
    def forward(ctx, x, y):
        # ctx 是上下文对象，用来保存反向需要的张量/标量
        ctx.save_for_backward(x, y)       # 保存张量（不能保存非张量）
        ctx.some_scalar = 0.5              # 保存标量直接挂属性
        out = x * y
        return out
    @staticmethod
    def backward(ctx, grad_out):
        # 恢复 forward 保存的东西
        x, y = ctx.saved_tensors
        # 计算对每个 forward 输入的梯度，按输入顺序返回
        grad_x = grad_out * y
        grad_y = grad_out * x
        return grad_x, grad_y
# 调用：不用 MyFunction().forward，而是 .apply
out = MyFunction.apply(x, y)
```

# 错误合集