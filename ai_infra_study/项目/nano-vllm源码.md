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
## 枚举
枚举内置函数
```python
fruits = ['apple', 'banana', 'cherry']

for i, fruit in enumerate(fruits):
    print(i, fruit)
# 0 apple
# 1 banana
# 2 cherry
```
enum模块
```python
from enum import Enum
class Status(Enum):
    PENDING = auto()   # 1
    RUNNING = auto()   # 2
    DONE = auto()      # 3
============
每个枚举类两个属性
Status.PENDING.value   #1
Status.PENDING.name   # PENDING
```



# 问题回答
## llm_engine.py
1.**在init函数声明变量**
self.config和config最大区别：前者挂载类上，后者是局部变量

| 名字                             | 作用域              | 生命周期                   | 谁能访问             |
| ------------------------------ | ---------------- | ---------------------- | ---------------- |
| **`config`（局部变量）**             | `__init__` 函数体内  | 函数返回后消失（但对象本身被引用不会 GC） | 只有 `__init__` 内部 |
| **`self.model_runner.config`** | ModelRunner 实例属性 | 和 ModelRunner 同寿命      | ModelRunner 内部   |
| **`self.scheduler.config`**    | Scheduler 实例属性   | 和 Scheduler 同寿命        | Scheduler 内部     |
2.**step内的数据流动**
每一个step内的seq独立判断,seq集合有输出eos，就移除
```python
running = [Seq0, Seq1, Seq2]
step 1 decode:
  Seq0 生成 t03，没到 max_tokens → 继续
  Seq1 生成 t13，命中 eos → FINISHED，移除
  Seq2 生成 t24，继续
running = [Seq0, Seq2]

step 2 decode:
  Seq0 生成 t04，继续
  Seq2 生成 t25，到 max_tokens → FINISHED，移除
running = [Seq0]

is_finished() → waiting 空 且 running 空 → True
generate 主循环退出
```
同一step内所有seq必须全部完成才返回用户结果
```python
while not self.is_finished():
```

3.**模型输出 `logits (9, vocab)`含义**
当前值是后一个字的概率预测
``` 
输入序列:   [t0, t1, t2, t3, ...]
位置索引:    0   1   2   3   ...
logits[0] 预测的是 t1
logits[1] 预测的是 t2
logits[2] 预测的是 t3
...
logits[i] 预测的是 t(i+1)
```

## scheduler.py
**1.如何保证一个step不混合prefill和decode**
```python
waiting队列 全新加入进来的seq
running队列 已经做过prefill的seq，全部kv在内存之中
```

**2.抢占只发生在需要分配空间的时候**
while else结构 true进入循环，false执行一次else
```python
while not self.block_manager.can_append(seq):     # ★ 只有 can_append 为 False 才进循环
    if self.running:
        self.preempt(self.running.pop())
    else:
        self.preempt(seq)
        break
else:
    # can_append 为 True 时走这里，正常加入 scheduled
```

## sequence.py
一个自己定义的类型
```python
```


# 标准检测
## 每个文件的数据是如何流动的。
维度信息，数据的含义，并发串行数据。


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
## transformers
模型编码和解码
```python
#去模型路径下找模型对应的tokenizer.json文件 ，使用rust加速实现
tokenizer=AutoTokenizer.from_pretrained(model_path,use_fast=True)  
str1="你好世界"  
token_id=tokenizer.encode(str1)  
#[108386, 99489]
word_id=tokenizer.decode(token_id)
#你好世界
===============
#获取该模型的停止标号
config.eos = self.tokenizer.eos_token_id
```
## xxhash
```python
import xxhash

h = xxhash.xxh64()          # 构造一个 XXH64 哈希对象（64 位输出）
h.update(b"hello")          # 喂入数据（bytes）
h.update(b" world")         # 可以分多次喂入，效果等同于一次性喂 "hello world"
h.intdigest()               # 拿到 64 位整数结果
h.hexdigest()               # 拿到十六进制字符串结果
h.digest()                  # 拿到 bytes 结果（大端序）
```
