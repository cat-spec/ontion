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