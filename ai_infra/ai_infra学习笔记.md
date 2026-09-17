## 阶段1：C++速成（9月份）

C++是Infra的入场券，面试第一关就是C++。你零基础，必须系统补。

**推荐资源：**

- **modern-cpp-learning-2025**（GitHub）——2025最新C++零基础到面试通关一站式指南，含学习路线+教程+面试题
    
    - 阶段1：入门基础（2-3周），变量、指针、引用、函数、编译链接
        
    - 阶段2：核心特性（3-4周），类与对象、拷贝/移动、继承多态
        
    - 阶段3：进阶（2-3周），模板、STL、智能指针
        
    - 阶段4：实战（4-6周），线程池、内存管理
        
- 《C++ Primer》当字典查，不要通读
    
- 侯捷C++系列视频（选看）
    

**每天投入**：1-1.5小时

**验收标准**：能手写线程池，能读懂PyTorch C++源码片段，能解释指针和引用的区别、虚函数机制、移动语义。

## 阶段2：CUDA从入门到能写算子（10月份中旬）

这是你简历上最核心的东西。C++和CUDA可以并行学，但CUDA必须动手写。

**推荐资源：**

- **CUDATutorial**（zeroRains/CUDATutorial）——从零开始学CUDA高性能编程，有完整学习路线
    
    - 新手村：环境搭建、第一个Kernel、nvprof性能分析
        
    - 初阶：并行计算、手写矩阵乘Matmul、性能优化
        
    - 中阶：手写Reduce、交叉寻址优化、Bank Conflict解决
        
    - 高阶：GEMM优化专题（二维Tile、向量化访存、Warp Tiling、双缓冲、Bank Conflict）
        
- **CUDA C Programming Guide**（官方文档，必读）
    
- **《Programming Massively Parallel Processors》** （PMCP）
    
- **CUDA Mode**（YouTube）
    

**实战项目（按顺序）：**

1. Vector Add → Matrix Transpose
    
2. 手写Naive GEMM → Shared Memory优化 → 接近cuBLAS 70%性能
    
3. 实现Softmax、LayerNorm
    
4. 实现简化版FlashAttention
    
5. 用ncu分析每个kernel的瓶颈
    

**每天投入**：1.5-2小时

**验收标准**：能手写接近cuBLAS 70%性能的GEMM，能用ncu定位性能瓶颈，能解释Memory Coalescing、Occupancy、Warp Divergence。

## 阶段3：PyTorch底层 + Triton（11月份）

学会把CUDA算子接入PyTorch，这是从“会写kernel”到“能做Infra”的关键一步。

**学习内容：**

- PyTorch扩展：用C++写算子、pybind11、CUDA扩展编译
    
- Triton：用Triton写Softmax、LayerNorm、FlashAttention
    
- 读源码：ATen、Dispatcher、autograd，不求全懂，能定位就行
    
- tinygrad（tinygrad/tinygrad）——极简深度学习框架，读源码就懂框架/算子怎么实现[](https://m.nowcoder.com/discuss/894300177815588864?sourceSSR=dynamic&weFlow=true)
    

**实战项目：**

- 用CUDA写一个自定义算子，接入PyTorch，对比eager模式和自定义kernel的性能
    
- 用Triton复现一个算子并和CUDA版本对比
    

**验收标准**：能写PyTorch自定义算子，能用Triton写kernel，能读懂PyTorch算子调用链。

## 阶段4：选一个方向深入（后续）

训练和推理选一个。建议选推理，因为岗位更多、更容易出成果。