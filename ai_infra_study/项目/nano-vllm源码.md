# 项目流程
用一段话复述（这也是面试里高频的「请求进来之后代码路径」题）：

1. 📥 业务脚本用 HuggingFace 分词器把 prompt 编码成 token id，调用 `llm.generate`。
2. `LLMEngine` 为每条 prompt 创建一个 `Sequence`，交给 `Scheduler` 的等待队列。
3. ⚙️ 主循环每执行一次 `step()`：`Scheduler` 根据 Token Budget 和 KV 余量选出本轮要跑的序列，并标记这是一次 **prefill**（处理 prompt）还是 **decode**（逐 token 生成）。
4. `ModelRunner` 把这批序列转成 GPU 张量，写好全局 `Context`，跑一遍 `Qwen3`。前向过程中 `Attention` 把新算出的 K/V 存进 KV Cache，再用 FlashAttention 算注意力。
5. 模型输出的 hidden state 过 `ParallelLMHead` 得到 logits，`Sampler` 按温度采样出下一个 token。
6. `Scheduler.postprocess` 把新 token 写回对应 `Sequence`，判断是否命中 EOS 或达到 `max_tokens`——结束的序列释放 KV 块，未结束的留到下一轮 decode。
7. 📤 所有序列结束后，按请求顺序解码成字符串返回。
**关键点**：**Prefill 和 Decode 不混在同一个 batch 里**（这一点与早期 vLLM 一致）。prefill 一次吃掉整段 prompt、是算力密集型；decode 每条序列每步只算一个 token、是访存密集型。调度器用「这一轮要么全 prefill、要么全 decode」的策略把两种负载分开，这是理解 `Scheduler` 的前提，3.5 会详细展开。


# 深度学习理论
## temperature 的直观效果（重点）

`logits / T` 再 softmax，T 的作用是**缩放分布的"尖锐程度"**：
当temperature不为0的时候，系统是选择multinomial
`multinomial` 就是"按概率分布掷骰子"：概率大的更容易被抽中，但不是必中。
当temperature不为0的时候，系统选择argmax

|T 值|分布形状|行为|直觉|
|---|---|---|---|
|**T = 1.0**|原始分布|标准采样|模型本来的倾向|
|**T < 1**（如 0.1）|更**尖锐**，高概率更高|更确定、更保守|放大差异，几乎总选 top-1|
|**T > 1**（如 2.0）|更**平坦**，低概率被抬高|更随机、更发散|缩小差异，冷门 token 也有机会|
|**T → 0**|极限是 one-hot 在 argmax 上|**greedy（确定性选最大）**|完全不变随机|
|**T → ∞**|极限是均匀分布|纯随机瞎选|完全不管模型|
# python语法解释
## 导入语法
```python
## 两种导包方式，第一种是导入对应的包
from model import name
## 我需要这个包下很多属性和方法 如果名字很长 可以as
import model as name
=============================
# 文件夹级别导包
nanovllm/
├── __init__.py
├── llm.py

#使用nanovllm 名字会自动执行__init__.py下代码
from nanovllm import LLM          # 等价于 from nanovllm.llm import LLM
llm = LLM(model="Qwen/Qwen3-0.6B")
# 第一次 import torch 时
# → Python 找到 torch/__init__.py
# → 从上到下执行里面的所有语句
# → 执行完把模块对象放进 sys.modules['torch']
# 之后再 import torch，直接拿缓存，不会重复执行
===================
#all关键字的作用是约束 `from nanovllm import *` 的行为：防止命名空间混乱
__all__ = ["LLM", "SamplingParams"]

```
## `*args` 与 `**kwargs` 详解
一句话：**`*args` 收集"多余的位置参数"成元组；`**kwargs` 收集"多余的关键字参数"成字典。** 二者名字里的 `args` / `kwargs` 只是惯例，`*` 和 `**` 才是语法本质。
```python
def demo(*args, **kwargs):
    print("args =", args, type(args))
    print("kwargs =", kwargs, type(kwargs))

demo(1, 2, 3, a=10, b=20)
# args = (1, 2, 3) <class 'tuple'>
# kwargs = {'a': 10, 'b': 20} <class 'dict'>
```
用法二：解包 展开数据
```python
def add(a, b, c):
    return a + b + c

nums = [1, 2, 3]
print(add(*nums))     # 6  ← 等价 add(1, 2, 3)
```


# 第三方API
## dataclasses
快速构造大量变量的值，不用重复写self.a=a的赋值
```python
from dataclasses import dataclass
@dataclass(slots=True)
class Config:
	a
	b
	c
	d
	e
	f
	=======================
	#本来我需要写大量的参数赋值
	__init__(self):
		self.a=a
		·······
	================
	#现在只用写
	__post_init__

```