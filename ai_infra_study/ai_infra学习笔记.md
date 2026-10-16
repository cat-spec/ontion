# 学习路线
## 阶段1：基础速成（9月份）

C++,python,c++,docker,k8s

**每天投入**：1-1.5小时

**验收标准**：能手写线程池，能读懂PyTorch C++源码片段，能解释指针和引用的区别、虚函数机制、移动语义。

## 阶段2：CUDA从入门到能写算子（10月份中旬）

FlashAttention AI 编译器 Triton
cuda->cuda architecture->cuda optimization
**具备素质**（按顺序）：
1. Vector Add → Matrix Transpose
2. 手写Naive GEMM → Shared Memory优化 → 接近cuBLAS 70%性能
3. 实现Softmax、LayerNorm，reduce,transpose,matmul
4. 实现简化版FlashAttention
5. 用ncu分析每个kernel的瓶颈
**每天投入**：1.5-2小时
**验收标准**：能手写接近cuBLAS 70%性能的GEMM，能用ncu定位性能瓶颈，能解释Memory Coalescing、Occupancy、Warp Divergence。
## 阶段3：PyTorch底层 + Triton（11月份）

深入理解pytorch DeepSpeed 理解张量并行(TP)、流水线并行(PP)

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
模型推理与部署 vllm KV Cache
## 阶段5：开启分布式

# CUDA
1. 分配GPU内存
2. 拷贝内存到设备
3. 调用CUDA内核函数来执行计算
4. 把计算完成数据拷贝回主机端
5. 内存销毁
## 通用处理错误手段
``` c++
#define CUDA_CHECK(call)                                                      
    do {                                                                       
        cudaError_t err = call;                                                
        if (err != cudaSuccess) {                                              
            fprintf(stderr, "CUDA error at %s:%d - %s\n",                     
                    __FILE__, __LINE__, cudaGetErrorString(err));              
            exit(EXIT_FAILURE);                                                
        }                                                                      
    } while (0)

```

## cpu与gpu架构区别

### 线程束和线程块
一句话理解：**warp（线程束）是 NVIDIA GPU 的基本调度单位，通常由 32 个线程组成。同一个warp内只能执行同一个指令。你写核函数时是“按线程”写，但硬件是“按 warp”发射指令。** 如果同一个 warp 内线程走了不同分支，就会发生 **分支发散**，硬件只能分时执行不同路径。
1. 先计算条件，硬件知道哪些 lane 满足 `if`，哪些满足 `else`。
    
2. 执行 `if` 路径时，只让偶数线程活跃，奇数线程被 mask 掉，不产生效果。
    
3. 执行 `else` 路径时，只让奇数线程活跃，偶数线程被 mask 掉。
    
4. 两条路径都执行完后，在 `if/else` 后面的汇合点重新汇合，warp 内所有线程继续一起执行后续代码。
## 关键字
### 三种修饰符
CUDA 用修饰符来标记函数在哪里执行、由谁调用：

|修饰符|执行位置|调用方|用途|
|---|---|---|---|
|`__global__`|GPU|CPU（或 GPU 动态并行）|Kernel 入口函数|
|`__device__`|GPU|GPU|Kernel 内部调用的辅助函数|
|`__host__`|CPU|CPU|普通 CPU 函数（默认）|
### 内置变量
最重要的就是玩懂这四个变量

| `threadIdx` | 当前 thread 在所属 block 内的坐标 | thread 在 block 中的位置            |
| ----------- | ------------------------ | ------------------------------ |
| `blockIdx`  | 当前 block 在 grid 内的坐标     | block 在 grid 中的位置              |
| `blockDim`  | 当前 block 每个维度的线程数        | block 的大小，即一个 block 有多少 thread |
| `gridDim`   | 当前 grid 每个维度的 block 数    | grid 的大小，即一个 grid 有多少 block    |
一共四个常用变量，都有x,y,z三个维度是数据
x为x轴方向上具有的元素个数
### Warp

如果说 Block 是逻辑上的协作单位，那 Warp 就是**物理上的执行单位**。SM（Streaming Multiprocessor）以 Warp 为粒度调度执行——一个 Warp 包含 32 个连续线程，它们在同一时钟周期内执行同一条指令（SIMT，Single Instruction Multiple Threads）。

当 Warp 内的线程走不同的分支路径时，发生 **Warp 分歧**——GPU 不得不串行执行两个分支：
```c++
// ❌ 容易导致分歧
if (threadIdx.x % 2 == 0) {
    // 偶数线程执行这里
    result = pathA(data);
} else {
    // 奇数线程执行这里
    result = pathB(data);
}

// ✅ 以 Warp 为边界分支，避免分歧
if (threadIdx.x / 32 < 2) {
    // 前两个 Warp 执行 pathA
    result = pathA(data);
} else {
    // 后续 Warp 执行 pathB
    result = pathB(data);
}

```

## 内存模型
学会把数据放在正确的地方
这意味着：**绝大多数 Kernel 的性能瓶颈不是计算，而是内存访问**。理解 CUDA 的多层内存层次，学会把数据放在”离计算最近的地方”，是优化 GPU 程序的第一课。
![[Pasted image 20260930142842.png]]

|标准C函数|CUDA C 函数|说明|
|---|---|---|
|malloc|cudaMalloc|内存分配|
|memcpy|cudaMemcpy|内存复制|
|memset|cudaMemset|内存设置|
|free|cudaFree|释放内存|
### 寄存器
在核函数中声明的变量都在gpu寄存器之中
如果一个线程里面的变量太多，这时候寄存器发生溢出，本地内存就会过来帮忙存储多出来的变量，这种情况会对效率产生非常负面的影响，所以，不到万不得已，一定要避免此种情况发生。
控制寄存器数据量，提升能获得资源的warp数量，提升并发
```c++
// 每 Block 最多256线程，目标每SM 2个
__global__ void __launch_bounds__(256, 2) Block my_kernel(...) { ... }
// 编译器行为 SM 寄存器总量（A100）= 65536 个/SM 
maxThreadsPerBlock=256, minBlocksPerMultiprocessor=2 
↓ 需要同时驻留：256线程 × 2block = 512线程
 ↓ 每线程最大寄存器数：65536 / 512 = 128个 
 ↓ 编译器将寄存器上限设为 128（通常会更激进压缩） 
 ↓ 溢出的变量 spill 到 Local Memory（显存）
```
![[Pasted image 20261004110441.png]]


### 本地内存
每个线程，如果寄存器溢出或数组动态索引，则会溢出到全局内存。溢出会导致性能直线下降。


### 共享内存
`__share__`
共享内存被划分为 **32 个 Bank**（对应一个 Warp 的 32 个线程）。  
地址映射规则：`Bank ID = (地址 / 4字节) % 32`。
每个SM都有一定数量的由线程块分配的共享内存，共享内存是片上内存，跟主存相比，速度要快很多，也即是延迟低，带宽高。其类似于一级缓存，但是可以被编程。

```c++
====================
#声明二维浮点数组 参数固定
__shared__ float a[size_x][size_y]; //必须在kernel函数里定义
# 动态数组 必须在启动时候配套使用
extern __shared__ int tile[];
kernel<<<grid,block,isize*sizeof(int)>>>(...);
===================
# 配置缓存
cudaError_t cudaFuncSetCacheConfig(const void * func,enum cudaFuncCache);
```

#### 共享展开规约
每一个block单独占用一个申请的共享内存。
利用特性多个块thread.x不唯一，单个block中thread.x唯一。



#### 存储体冲突
线程束访问共享内存的时候有下面3种经典模式：
1. 并行访问，多地址访问多存储体
2. 串行访问，多地址访问同一存储体
3. 广播访问，单一地址读取单一存储体
这时候又两种可能
4. 冲突：这时候就要等待了
5. 不冲突：访问同一个存储体的线程都要访问同一个地址，通过广播解决问题。

#### 同步
同步是并行的重要机制，其主要目的就是防止冲突。同步基本方法：

1. 障碍
```c++
==================
# 1. __syncthreads()作为一个障碍点，他保证在同一线程块内所有线程没到达此障碍点时，不能继续向下执行。
# 2. 同一线程块内此障碍点之前的所有全局内存，共享内存操作，对后面的线程都是可见的。
# 3. 这个也就能解决同一线程块内（block），内存竞争的问题，同步，保证先后顺序，不会混乱。
# 4. 避免死锁情况出现，比如下面这种情况，就会导致内核死锁：
__syncthreads();
```

2. 内存栅栏
```c++
============
// Block 级：确保写入对同一 Block 内的线程可见
__threadfence_block();

// Device 级：确保写入对同一 GPU 上所有线程可见
__threadfence();

// System 级：确保写入对系统内所有设备（包括 CPU、其他 GPU）可见
__threadfence_system();

```
3.原子操作
```c++
// 非原子操作（data race！）
// 线程A：读 counter=5, 加1, 写回6
// 线程B：读 counter=5, 加1, 写回6  ← 丢失了线程A的更新！
counter += 1;

// 原子操作（正确）
// 硬件保证 读→改→写 在一条不可中断的操作中完成
atomicAdd(&counter, 1);

```

|📊 操作|函数|支持类型|
|---|---|---|
|加法|`atomicAdd(addr, val)`|int, unsigned, float, double|
|减法|`atomicSub(addr, val)`|int, unsigned|
|最小值|`atomicMin(addr, val)`|int, unsigned|
|最大值|`atomicMax(addr, val)`|int, unsigned|
|交换|`atomicExch(addr, val)`|int, unsigned, float|
|CAS|`atomicCAS(addr, compare, val)`|int, unsigned, unsigned long long|
|按位与|`atomicAnd(addr, val)`|int, unsigned|
|按位或|`atomicOr(addr, val)`|int, unsigned|
|按位异或|`atomicXor(addr, val)`|int, unsigned|
|递增|`atomicInc(addr, val)`|unsigned|
|递减|`atomicDec(addr, val)`|unsigned|


### 常量内存
`__constant__`
叫常量内存，显然是不能被修改的，这里不能被修改指的是被核函数修改，主机端代码是可以初始化常量内存的，不然这个内存谁都不能改就没有什么使用意义了，常量内存，被主机端初始化后不能被核函数修改
### 纹理内存

### 线程束洗牌
```c++
## 大白话：读取寄存器指定“var”变量的值返回，读取srcLane位置线程的值，规定warp大小为32。
#mask指定参与运算的线程内个数 0xffffffff 32个全1
T __shfl_sync     (unsigned mask, T var, int srcLane,  int width = warpSize);
# lane-delta  大于或者小于0-31范围则为本身，否则自然读取
T __shfl_up_sync  (unsigned mask, T var, unsigned delta, int width = warpSize);
# /lane+delta
T __shfl_down_sync(unsigned mask, T var, unsigned delta, int width = warpSize);
# 源lane=当前lane^laneMask
T __shfl_xor_sync (unsigned mask, T var, int laneMask, int width = warpSize);
```

### 全局内存
动态分配
`cudaMalloc()`
静态分配
```c++
__device__ float devData;
cudaMemcpyToSymbol(device_variable,host_pointer,size)
cudaMemcpyFromSymbol(host_pointer,device_variable,size)
```
- **`cudaMalloc`**：在**运行时**，从 GPU 的**显存堆（Heap）**中动态申请一块内存，返回一个**指针**。需要手动 `cudaFree` 释放。
    
- **`__device__`**：在**编译期**，在 GPU 的**全局数据段（静态存储区）**静态分配一块内存，它就是一个**符号（Symbol）**。程序结束时自动释放。
### 分配方式

#### 固定内存分配
```c++  
#在主机端 开辟一个固定页表的 数据空间。
cudaError_t cudaMallocHost(void ** devPtr,size_t count)
cudaError_t cudaFreeHost(void *ptr)
```
#### 零拷贝内存
**极其缓慢**
GPU线程可以直接访问零拷贝内存，这部分内存在主机内存里面，CUDA核函数使用零拷贝内存有以下几种情况：

- 当设备内存不足的时候可以利用主机内存
- 避免主机和设备之间的显式内存传输
- 提高PCIe传输率
```c++
cudaError_t cudaHostAlloc(void ** pHost,size_t count,unsigned int flags)
最后一个标志参数，可以选择以下值：

- cudaHostAllocDefalt
- cudaHostAllocPortable
- cudaHostAllocWriteCombined
- cudaHostAllocMapped  
    cudaHostAllocDefalt和cudaMallocHost函数一致，cudaHostAllocPortable函数返回能被所有CUDA上下文使用的固定内存，cudaHostAllocWriteCombined返回写结合内存，在某些设备上这种内存传输效率更高。cudaHostAllocMapped产生零拷贝内存。
    
============
cudaError_t cudaHostGetDevicePointer(void ** pDevice,void * pHost,unsigned flags);


// 1. 分配映射内存（Mapped Memory）
float *h_a;
cudaHostAlloc((void**)&h_a, N * sizeof(float), cudaHostAllocMapped);
// 2. 获取 GPU 端的设备指针
float *d_a;
cudaHostGetDevicePointer((void**)&d_a, h_a, 0);
```
#### 统一虚拟寻址
底层实现还是零拷贝
#### 统一内存寻址
```c++
cudaError_t cudaMallocManaged(void ** devPtr,size_t size,unsigned int flags=0)
```


### 内存访问模式
如果启用一级缓存，那么每次从DRAM上加载数据的粒度是128字节，如果不适用一级缓存，只是用二级缓存，那么粒度是32字节。
当一个内存事务的首个访问地址是缓存粒度（32或128字节）的偶数倍的时候：比如二级缓存32字节的偶数倍64，128字节的偶数倍256的时候，这个时候被称为对齐内存访问，非对齐访问就是除上述的其他情况，非对齐的内存访问会造成带宽浪费。

### 内存带宽利用率
![[Pasted image 20261001104548.png]]
传输数据总量B/时间=B×10^-9


#### 内存分配场景

- **场景一：追求极致的传输性能，手动控制**
    
    - **选择**：**固定内存 + 异步拷贝**。
        
    - **理由**：当你需要进行大规模、规律的数据传输，并且希望完全掌控拷贝时机与计算重叠时，这是最经典的高性能模式。
        
- **场景二：GPU显存有限，需要处理超大且访问稀疏的数据集**
    
    - **选择**：**零拷贝内存**。
        
    - **理由**：数据保留在主机内存，GPU按需通过PCIe读取。这避免了因显存不足而无法运行的问题。但请务必确保你的核函数访问模式是粗粒度的，以避免PCIe延迟成为瓶颈。
        
- **场景三：简化代码，快速原型开发，或对性能不那么敏感**
    
    - **选择**：**统一内存**。
        
    - **理由**：你只想写一个能在CPU和GPU上都能跑的单指针程序，不想被`cudaMemcpy`和内存分配困扰。统一内存让代码更简洁，可移植性更好。对于访问模式规律、数据量适中的情况，其性能损失可以接受。

### 内存总结

![[Pasted image 20260930144429.png]]

![[Pasted image 20260930143658.png]]


## 归约
归约的方式基本包括如下几个步骤：

1. 将输入向量划分到更小的数据块中
2. 用一个线程计算一个数据块的部分和
3. 对每个数据块的部分和再求和得到最终的结果。
### 临近归约
```c++
__global__ void reduce0(float* g_idata, float* g_odata, unsigned int n) {
	int x = threadIdx.x;
	//每一个block中第一个元素
	float* idata=g_idata+blockDim.x*blockIdx.x;
	for (int stride = 1; stride < blockDim.x; stride *= 2) {
		//只要偶数索引，步长，线程
		int index = 2 * stride * x;
		if (index < blockDim.x) {
			//每一个块内偶数下标+步长下标
			idata[index] += idata[index + stride];
		}
		__syncthreads();
	}
	if (x == 0) {
		//每个块内第一个元素，是加和结果
	g_odata[blockIdx.x] = idata[0];
	}
}
```

### 展开归约
```c++
gridsize = (n + blocksize * 4 - 1) / (blocksize * 4); //gridsize算法不同
__global__ void reduce2(float* g_idata, float* g_odata, unsigned int n) {
	int x = threadIdx.x;
	//展开大小为4个
	float* idata = g_idata + blockDim.x * blockIdx.x * 4;
	//block相加 只要偶数块动
	int idx = blockDim.x * blockIdx.x * 4 + x;
	//block内相加，要属于block范围内
	if (idx + 3*blockDim.x < n) {
		//block内 偶数block加奇数块每一个元素  偏移一整个块
		float a_1 = g_idata[idx];
		float a_2= g_idata[idx + blockDim.x];
		float a_3= g_idata[idx + blockDim.x*2];
		float a_4 = g_idata[idx + blockDim.x*3];
        g_idata[idx] = a_1 + a_2 + a_3 + a_4;
	}
	__syncthreads();
	//block内相加，要属于block范围内
	for (int stride = blockDim.x / 2; stride > 0; stride /= 2) {
		if (x < stride) {
			idata[x] += idata[x + stride];
		}
		__syncthreads();
	}
	if (x == 0) {
		g_odata[blockIdx.x] = idata[0];
	}
}
```


### 规约注意点
1.**展开不是“多个 block 合并到一起”，而是“每个 block 内部，每个线程一次加载多个元素**
2.**一个block内线程会处理所有展开的数据，所以实际需要的grid大小会改变**
`gridsize=(n+reduce*blocksize-1)/reduce*blocksize`
3.

## 流、并发
流分为：
- 隐式声明的流，我们叫做空流
- 显式声明的流，我们叫做非空流

基于流的异步内核启动和数据传输支持以下类型的粗粒度并发
- 重叠主机和设备计算
- 重叠主机计算和主机设备数据传输
- 重叠主机设备数据传输和设备计算
- 并发设备计算（多个设备）

接下来必须要特别注意：  
执行异步数据传输时，主机端的内存必须是固定的，非分页的！！
```C++
cudaStream_t csteam1
# 创建 启动流配置  释放流
cudaError_t cudaStreamCreate(cudaStream_t* pStream);
kernel_name<<<grid, block, sharedMemSize, stream>>>(argument list);
cudaError_t cudaStreamDestroy(cudaStream_t stream);
## 查询流的情况
cudaError_t cudaStreamSynchronize(cudaStream_t stream);  
cudaError_t cudaStreamQuery(cudaStream_t stream);
#这两条执行的行为非常不同，cudaStreamSynchronize会阻塞主机，直到流完成。cudaStreamQuery则是立即返回，如果查询的流执行完了，那么返回cudaSuccess否则返回cudaErrorNotReady。
===============================
# 下面函数创建一个有指定优先级的流
cudaError_t cudaStreamCreateWithPriority(cudaStream_t* pStream, unsigned int flags,int priority);
# 不同的设备有不同的优先级等级，下面函数可以查询当前设备的优先级分布情况：
# flags cudaStreamDefault;// 默认阻塞流  cudaStreamNonBlocking: //非阻塞流，对空流的阻塞行为失效。
cudaError_t cudaDeviceGetStreamPriorityRange(int *leastPriority, int *greatestPriority);
```

### 同步流
- 异步流（非空流）
- 同步流（空流/默认流）
### 隐式同步
显示同步
```c++
cudaDeviceSynchronize;  
cudaStreamSynchronize;  
cudaEventSynchronize;
# 这条命令的含义是，指定的流要等待指定的事件，事件完成后流才能继续，这个事件可以在这个流# 中，也可以不在，当在不同的流的时候，这个就是实现了跨流同步。
cudaError_t cudaStreamWaitEvent(cudaStream_t stream, cudaEvent_t event);

```
隐式同步
所谓同步就是阻塞的意思，被忽视的隐式同步就是被忽略的阻塞，隐式操作常出现在内存操作上，比如：

- 锁页主机内存分布
- 设备内存分配
- 设备内存初始化
- 同一设备两地址之间的内存复制
- 一级缓存，共享内存配置修改
**“阻塞流”里的“阻塞”，指的是它会和“默认流（空流）”发生隐式同步，而不是指它会阻塞其他非空流，更不是指它会阻塞 CPU。**
**经典例子**
默认流（`NULL` 流）是特殊的。它和**阻塞流**(设备之间的阻塞)之间有隐式同步：
1. **默认流中的操作** 会等待 **在它之前提交到所有阻塞流中的操作** 完成。
2. **在默认流操作之后提交到阻塞流中的操作**，会等待 **默认流中的操作** 完成。
```c++ 
kernel_1<<<1,1,0, stream_1>>>();  // 阻塞流
kernel_2<<<1,1>>>();               // 默认流
kernel_3<<<1,1,0, stream_2>>>();  // 阻塞流
```
- CPU：依次提交三个 kernel，完全不阻塞。
    
- GPU：因为默认流的隐式同步，实际执行顺序被强制为 1->2->3
![[Pasted image 20261003104639.png]]
**注意** 1.阻塞流不要与默认流一起，会造成严重等待串行  2.使用非阻塞流
### 事件
- 同步流执行
- 监控设备的进展  
    流中的任意点都可以通过API插入事件以及查询事件完成的函数，只有事件所在流中其之前的操作都完成后才能触发事件完成。默认流中设置事件，那么其前面的所有操作都完成时，事件才出发完成。  
    事件就像一个个路标，其本身不执行什么功能，就像我们最原始测试c语言程序的时候插入的无数多个printf一样。

```c++
cudaEvent_t event;
# 分配资源
cudaError_t cudaEventCreate(cudaEvent_t* event);
# 回收资源
cudaError_t cudaEventDestroy(cudaEvent_t event);
# 事件通过下面指令添加到CUDA流：
cudaError_t cudaEventRecord(cudaEvent_t event, cudaStream_t stream = 0);
# 这个不会阻塞主机线程，而是直接返回结果和stream版本的类似。  
cudaError_t cudaEventSynchronize(cudaEvent_t event);
cudaError_t cudaEventQuery(cudaEvent_t event);
# 另一个函数用在事件上的是记录两个事件之间的时间间隔：
cudaError_t cudaEventElapsedTime(float* ms, cudaEvent_t start, cudaEvent_t stop);
```

## 向量化访问
**减少内存指令数量**、**提升带宽利用率**，并**增加线程级并行度（ILP）**。
### 内存布局与对齐要求
`float4` 的硬件优势建立在一个严格的前提之上：**16 字节对齐**。
- **定义与结构**：`float4` 在 CUDA 头文件中被定义为一个结构体，包含 `x`, `y`, `z`, `w` 四个 `float` 成员。其类型大小为 16 字节，对齐要求也是 16 字节[](https://docs.nvidia.com/cuda/archive/13.4.1/cuda-programming-guide/05-appendices/cpp-language-extensions.html#2)。
    
- **对齐的强制性**：如果访问的地址不是 16 字节对齐的，编译器不会生成单条 128-bit 指令，而是**拆分成多条标量指令**，且可能产生交错访问模式，导致性能不升反降。官方文档明确指出，读取非自然对齐的 8 字节或 16 字节数据会产生**错误结果**（数据偏移）。
    
- **如何保证对齐**：`cudaMalloc` 返回的全局内存基址天然满足 256 字节对齐，因此只要数组索引是 4 的倍数（如 `idx = 4 * global_thread_id`），地址就自动满足 16 字节对齐[](https://github.com/xlite-dev/LeetCUDA/releases/download/v4.0.1/leetcuda-20260918.pdf#133#11)。对于二维数组，若行宽不是 4 的倍数，则需要**填充（padding）** 到 16 字节边界来保证每一行的起始地址对齐[](https://futhark-lang.org/student-projects/MSc-Convolutions-Emil-Johann.pdf#7#5)。
基础使用
```c++
//普通维度数值转为 4个float向量
float4* data=reinterpret_cast<float4*>(x)
=====================
//向量使用方式
__global__ void relu_vec4(float4* data, int n_vec4) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n_vec4) {
        float4 v = data[idx];  // 单条 128-bit 加载
        v.x = fmaxf(0.0f, v.x);
        v.y = fmaxf(0.0f, v.y);
        v.z = fmaxf(0.0f, v.z);
        v.w = fmaxf(0.0f, v.w);
        data[idx] = v;         // 单条 128-bit 存储
    }
}
```
处理尾部情况
```c++
// 主机端计算
// 处理尾部元素（N 不是 4 的倍数时） 
for (int i = N4 * 4 + tid; i < N; i += blockDim.x) {
 local_max = fmaxf(local_max, x[i]); 
 }
```

## 专属硬件指令


## 性能优化总结

### 带宽受限  （计算强度< 硬件阈值）
优化核心：**减少访存，增加数据复用，提升访存效率**。
- **方向一：提升访存合并（Coalesced Access）**。确保 Warp 内的 32 个线程访问连续的内存地址（如 `threadIdx.x` 对应 `index`），避免跨步（Stride）访问。使用 `float4`/`int4` 向量化访存，将多次小内存事务合并为一次大事务。
- **方向二：增加数据复用（共享内存/寄存器）**。例如矩阵乘法，将 A、B 矩阵分块读入 Shared Memory，让每个数据被多次计算复用，而不是反复从 Global Memory 读取。
- **方向三：提高占用率（Occupancy）**。如果是带宽受限，通常需要更多的 Warp 来隐藏内存延迟。检查寄存器使用量，降低寄存器压力，增加 Block 数。
- **方向四：减少不必要的读写**。例如 Softmax，原本需要读一次算最大值，再读一次算 exp，再读一次算归一化。如果 N 比较小，可以**只读一次全局内存，放入寄存器或 Shared Memory 中**，后续全在片上缓存操作，最后只写一次全局内存。
- **方向五：向量化加载** float4每一个线程加载4个变量16B。虽然总数据量变大了，但**指令数量减少了**（从32条Load指令变成8条Load指令）。
### 计算受限 （计算强度>硬件阈值）
优化核心：**减少指令数，使用更快的指令，提升指令级并行**。
- **方向一：使用硬件内置函数（Intrinsic）**。将 `expf` 替换为 `__expf`（牺牲少许精度，速度提升几十倍），将除法 `a / b` 替换为乘法 `a * __frcp_rn(b)`。
- **方向二：使用 FMA 指令**。合并乘法和加法。现代编译器通常会自动优化，但手动合并有助于提升。
- **方向三：消除分支发散（Warp Divergence）**。如果 Warp 内线程走 `if` 和 `else` 不同分支，硬件会串行执行两个分支。尽量让同一个 Warp 内的线程走相同分支。
- **方向四：提高指令级并行（ILP）**。手动展开循环（Loop Unrolling），让编译器尽可能调度独立的指令，填满流水线。
- **方向五：使用 Tensor Core**。如果涉及矩阵运算，使用 WMMA API 或 CUTLASS 库将 FP32 算子转换为 TF32/BF16 的 Tensor Core 运算。
### 性能注意点
#### 减少编写循环，分支语句
#### 注意warp分化

#### 注意不要产生warp conflict
## 性能评测

### 性能指标
#### 算术强度：衡量一个kernel是依靠算力还是依靠带宽
算术强度<硬件阈值 则为带宽受限，>则算力受限
#### 带宽：1s中传输的GB，通常追求理论的90%
![[Pasted image 20261004102640.png]]
warp(32)分化：衡量warp分支是否被分化，
![[Pasted image 20261004103531.png]]
occupancy占有率计算
![[Pasted image 20261004215120.png]]




### `nsys profile`
```shell
第一步
===============
#输出核心数据到cmd --stats=true
#输出文件 -o output-name  
nsys profile --stats=true -o my_report ./your_application
第二步
=========================
#在cmd输出特定报告
# nsys stats --report <报告名称> [,<报告名称>...] <报告文件.nsys-rep>
# 只生成 Kernel 耗时汇总报告 多个报告用，隔开
nsys stats --report cuda_gpu_kern_sum sqlite_name
```
#### 常用报告名字
| 报告名称                        | 输出的信息描述                                                                                                                                                                                             | 主要回答的问题                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **`cuda_gpu_kern_sum`**     | 按耗时降序排列所有 CUDA Kernel，显示每个 Kernel 的总耗时、调用次数、平均耗时及占比。                                                                                                                                                | **“哪个 Kernel 最耗时？”**（定位优化重点） |
| **`cuda_api_sum`**          | 汇总所有 CUDA API 函数（如 `cudaMalloc`, `cudaMemcpy`）的调用次数、总耗时、平均耗时等[](https://developer.download.nvidia.com/devtools/nsight-systems/UserGuide.pdf#7#7)。                                                   | **“CPU 侧哪些 CUDA 调用最花时间？”**   |
| **`cuda_gpu_mem_time_sum`** | 按耗时汇总 GPU 内存操作（H2D/D2H 拷贝等），显示总时间和平均时间[](https://developer.download.nvidia.com/devtools/nsight-systems/Nsight_Systems_User_Guide_2023.3.1.92-3314722.pdf#32#30)。                                    | **“数据传输（H2D/D2H）开销有多大？”**    |
| **`cuda_gpu_mem_size_sum`** | 按数据量大小汇总 GPU 内存操作，显示每次操作传输的 KiB 数。                                                                                                                                                                  | **“总共传输了多少数据？”**             |
| **`osrt_sum`**              | 汇总操作系统运行时 API（如 `poll`, `ioctl`, `mmap`）的耗时。                                                                                                                                                        | **“CPU 时间花在 OS 调用上了吗？”**     |
| **`nvtx_sum`**              | 汇总代码中通过 NVTX 标记的自定义范围（Range）的耗时[](https://developer.download.nvidia.com/devtools/nsight-systems/Nsight_Systems_User_Guide_2023.3.1.92-3314722.pdf#32#30)。                                           | **“自定义标注的代码段各花了多久？”**        |
| **`cuda_api_sync`**         | 专门分析 CUDA 同步 API（如 `cudaDeviceSynchronize`, `cudaStreamSynchronize`）的调用情况[](https://developer.download.nvidia.com/devtools/nsight-systems/Nsight_Systems_User_Guide_2023.3.1.92-3314722.pdf#32#30)。 | **“是否存在过多的同步等待？”**           |
| **`gpu_gaps`**              | 识别 GPU 空闲时间超过阈值的区域。                                                                                                                                                                                 | **“GPU 在哪些时间段是空闲的？”**        |
| **`cuda_gpu_trace`**        | 列出每次 Kernel 启动的详细时间戳，用于观察启动间隙和流重叠。                                                                                                                                                                  | **“Kernel 之间是否存在启动空隙？”**     |

### `ncu`
快速输出程序简短信息
```c++
ncu --print-summary 
```
精准输出自己想要的信息
```c++
ncu --metrics name ./my_program
```

## 经典错误
1.传过去指针，但是gpu内存中并没有该指针指向的地址
```c++
__global__ void checkIndex(int *list)
{
//一维数组的下标公式 
	int idx = blockIdx.x * blockDim.x + threadIdx.x;
	printf("%d", list[idx]);
}
```
2.使用WarpShuffle进行规约后需要对每一个**进程进行广播**
```c++
__device__ float warpReduceMax(float val) { 
	for (int offset = 16; offset > 0; offset >>= 1) { 
	val = fmaxf(val, __shfl_down_sync(0xffffffff, val, offset)); } 
	return val;
 }
 __device__ float blockReduceMaxShuffle(float val) {
  __shared__ float warp_max[32]; 
  int lane = threadIdx.x % 32; 
  int wid = threadIdx.x / 32; 
  val = warpReduceMax(val);
   if (lane == 0) warp_max[wid] = val;
    __syncthreads();
     int num_warps = blockDim.x / 32; 
     val = (lane < num_warps) ? warp_max[lane] : -INFINITY; if (wid == 0) val = warpReduceMax(val); // 广播结果给所有线程 
     __shared__ float block_result; 
     if (threadIdx.x == 0) block_result = val;
      __syncthreads();
       return block_result; }
```

## API持续学习
### 显卡信息
```c++
int dev=0,driverVersion=0,runtimeVersion=0;  
    cudaSetDevice(dev);  
    cudaDeviceProp deviceProp;  
    #第一个参数 返回值  设备数（可能有多个显卡）
    cudaGetDeviceProperties(&deviceProp,dev);
    
    deviceProp.memoryBusWidth
    
    deviceProp.totalConstMem
    
    deviceProp.sharedMemPerBlock
    
    deviceProp.regsPerBlock
```
## 入门实战

### 规约reduce

### 转置

### 洗牌

### 矩阵乘

### 多流传输计算
问题注意点：主要是导致串行
1.主机端创建固定页表
2.硬件资源不足：消费级显卡 hTd 或者dTh各有一个，传输数据无法并行。只有计算可以并行
3.阻塞流与默认流的隐式同步
##### 核心代码
```c++
cudaStream_t stream[streamNums];
for (int i = 0; i < streamNums; i++) {
    CHECK(cudaStreamCreateWithFlags(&stream[i], cudaStreamNonBlocking));
}

int* h_a = NULL, * h_b = NULL, * h_c = NULL;
// 检查分配
CHECK(cudaMallocHost((void**)&h_a, sizeof(int) * N));
CHECK(cudaMallocHost((void**)&h_b, sizeof(int) * N));
CHECK(cudaMallocHost((void**)&h_c, sizeof(int) * N));

// 初始化主机数据
init_data(h_a, h_b, N);

int* d_a = NULL, * d_b = NULL, * d_c = NULL;
CHECK(cudaMalloc((void**)&d_a, sizeof(int) * N));
CHECK(cudaMalloc((void**)&d_b, sizeof(int) * N));
CHECK(cudaMalloc((void**)&d_c, sizeof(int) * N));

// 删除无用的 addnostream 调用（它只会浪费 GPU 时间并污染数据）

for (int i = 0; i < streamNums; i++) {
    int idx_h = i * offset;
    // 每个流只拷贝自己的分块
    CHECK(cudaMemcpyAsync(&d_a[idx_h], &h_a[idx_h], offset * sizeof(int), cudaMemcpyHostToDevice, stream[i]));
    CHECK(cudaMemcpyAsync(&d_b[idx_h], &h_b[idx_h], offset * sizeof(int), cudaMemcpyHostToDevice, stream[i]));

    // 修正2：核函数只计算自己的分块，合理设置 grid 和 block
    int gridsize = (offset + 255) / 256;
    add << <gridsize, 256, 0, stream[i] >> > (&d_a[idx_h], &d_b[idx_h], &d_c[idx_h], offset);

    // 每个流只拷回自己的分块
    CHECK(cudaMemcpyAsync(&h_c[idx_h], &d_c[idx_h], offset * sizeof(int), cudaMemcpyDeviceToHost, stream[i]));
}

printf("CPU 全部提交到队列之中\n");

// 修正3：必须同步！等待所有流执行完毕，才能释放内存
CHECK(cudaDeviceSynchronize()); // 或者用 cudaStreamSynchronize(stream[i]) 逐个等待

for (int i = 0; i < streamNums; i++) {
    cudaStreamDestroy(stream[i]);
}

```
##### 结果显示
![[Pasted image 20261003170822.png]]
1.计算可以和传输并行

### Attention算子

### GEMM
矩阵乘

### Softmax

### Online Softmax
当前正确和L=之前和 × e的前最大值-最新最大值 + e的当前值-最大值
![[Pasted image 20261007195039.png]]
### Attention

# triton
## 第一部分：Triton 编程模型与基础概念

### 1.1 什么是 Triton

Triton 是 OpenAI 开发的一种类 Python 的 GPU 编程语言和编译器，专为简化高性能 GPU 内核的开发而设计。与 CUDA 需要管理线程和共享内存不同，Triton 采用**块级（Block-level）编程**抽象：你只需要关注数据块的操作，线程调度、共享内存分配、指令级并行等底层细节全部由编译器自动处理。

**核心概念对照：**

|CUDA 概念|Triton 对应|
|---|---|
|Thread|无（编译器自动处理）|
|Block/CTA|Program（内核实例）|
|Grid|Grid（程序实例的集合）|
|threadIdx|无|
|blockIdx|`tl.program_id(axis)`|
|`__shared__`|由编译器自动管理|
## 第二部分：triton.language API 全解析

Triton 的公开 API 统一从 `triton.language`（别名 `tl`）命名空间导出，按语义划分为 15 大类[](https://blog.gitcode.com/bc8ead2e6889d36ea6c2f01e95158460.html#1)。以下逐一讲解每一类的核心 API。

### 2.1 编程模型 API（Programming Model）

| API                     | 作用                        |
| ----------------------- | ------------------------- |
| `tl.program_id(axis)`   | 返回当前 Program 在指定轴上的 ID    |
| `tl.num_programs(axis)` | 返回沿指定轴启动的 Program 总数      |
| `tl.tensor`             | Triton 张量类型，内核中数据的基本载体    |
| `tl.tensor_descriptor`  | 全局内存中张量的描述符（TMA/TDM 访存入口） |
`axis` 必须是 0、1 或 2，（x轴，y轴，z轴）对应三维网格的三个维度 
### 2.2 创建操作 API（Creation Ops）

| API                            | 作用                            | 关键约束                                                                                                                                  |
| ------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `tl.arange(start, end)`        | 返回半开区间 `[start, end)` 的连续整数张量 | start 和 end 必须是 2 的幂，`end - start` 不能超过 `TRITON_MAX_TENSOR_NUMEL`[](https://blog.gitcode.com/bc8ead2e6889d36ea6c2f01e95158460.html#1) |
| `tl.full(shape, value, dtype)` | 用标量填充指定形状                     | shape 如 `(8, 16)`                                                                                                                     |
| `tl.zeros(shape, dtype)`       | 全零张量                          | 由 `full` 变体实现                                                                                                                         |
| `tl.zeros_like(input)`         | 与输入形状类型相同的全零张量                | —                                                                                                                                     |
| `tl.cast(input, dtype)`        | 类型转换                          | 支持 `bitcast` 和舍入模式                                                                                                                    |
| `tl.cat(input, other, dim=0)`  | 沿指定维度拼接                       | 要求两张量秩与形状一致                                                                                                                           |
### 2.3 形状操作 API（Shape Manipulation Ops）

| API                              | 作用              |
| -------------------------------- | --------------- |
| `tl.broadcast(a, b)`             | 将两个张量广播为兼容的公共形状 |
| `tl.broadcast_to(tensor, shape)` | 将张量广播到指定形状      |
| `tl.expand_dims(tensor, axis)`   | 插入长度为 1 的新维度    |
| `tl.reshape(tensor, shape)`      | 改变张量形状          |
| `tl.permute(tensor, dims)`       | 重排张量维度          |
| `tl.ravel(tensor)`               | 返回连续扁平视图        |
| `tl.trans(tensor)`               | 转置张量（反转维度顺序）    |
| `tl.interleave(a, b)`            | 沿最后维度交错两个张量的值   |
### 2.4 线性代数 API（Linear Algebra Ops）

| API                                     | 作用                             |
| --------------------------------------- | ------------------------------ |
| `tl.dot(a, b, acc=None)`                | 计算两个块的矩阵乘积，自动使用 Tensor Core 加速 |
| `tl.dot_scaled(a, a_scale, b, b_scale)` | 微缩放格式的矩阵乘法                     |
### 2.5 内存/指针操作 API（Memory/Pointer Ops）

| API                                       | 作用                   |
| ----------------------------------------- | -------------------- |
| `tl.load(pointer, mask=None, other=None)` | 从 global memory 加载数据 |
| `tl.store(pointer, value, mask=None)`     | 将数据写入global memory   |
| `tl.make_tensor_descriptor`               | 创建张量描述符对象            |
| `tl.load_tensor_descriptor`               | 从张量描述符加载数据块          |
| `tl.store_tensor_descriptor`              | 将数据块存入张量描述符          |
| `tl.make_block_ptr`                       | 返回指向父张量中某个块的指针       |
| `tl.advance`                              | 推进块指针                |
### 2.6 索引操作 API（Indexing Ops）

| API                                          | 作用                 |
| -------------------------------------------- | ------------------ |
| `tl.flip(x, dim)`                            | 沿指定维度翻转张量          |
| `tl.where(condition, x, y)`                  | 满足条件走 x ，不满足走 y    |
| `tl.swizzle2d(i, j, size_i, size_j, size_g)` | 将行主序矩阵索引转换为列主序矩阵索引 |
### 2.7 数学操作 API（Math Ops）

| API                     | 作用             | API                | 作用        |
| ----------------------- | -------------- | ------------------ | --------- |
| `tl.abs(x)`             | 绝对值            | `tl.exp(x)`        | 指数函数 e^x  |
| `tl.ceil(x)`            | 向上取整           | `tl.exp2(x)`       | 2^x       |
| `tl.floor(x)`           | 向下取整           | `tl.log(x)`        | 自然对数      |
| `tl.clamp(x, min, max)` | 限制到 [min, max] | `tl.log2(x)`       | 以 2 为底的对数 |
| `tl.cos(x)`             | 余弦             | `tl.sqrt(x)`       | 平方根       |
| `tl.sin(x)`             | 正弦             | `tl.rsqrt(x)`      | 平方根倒数     |
| `tl.sigmoid(x)`         | Sigmoid 函数     | `tl.softmax(x)`    | Softmax   |
| `tl.fma(x, y, z)`       | 融合乘加 x*y+z     | `tl.maximum(x, y)` | 逐元素最大值    |
| `tl.cdiv(x, y)`         | 向上取整除法         | `tl.minimum(x, y)` | 逐元素最小值    |
| `tl.fdiv(x, y)`         | 快速除法           | `tl.umulhi(x, y)`  | 高位乘法      |
### 2.8 归约操作 API（Reduction Ops）

| API                                  | 作用            |
| ------------------------------------ | ------------- |
| `tl.sum(input, axis)`                | 沿指定轴求和        |
| `tl.max(input, axis)`                | 沿指定轴求最大值      |
| `tl.min(input, axis)`                | 沿指定轴求最小值      |
| `tl.argmax(input, axis)`             | 返回最大值的索引      |
| `tl.argmin(input, axis)`             | 返回最小值的索引      |
| `tl.reduce(input, axis, combine_fn)` | 使用自定义组合函数沿轴归约 |
| `tl.xor_sum(input, axis)`            | 沿轴求异或和        |
### 2.9 原子操作 API（Atomic Ops）

| API                              | 作用      |
| -------------------------------- | ------- |
| `tl.atomic_add(ptr, val, mask)`  | 原子加法    |
| `tl.atomic_max(ptr, val, mask)`  | 原子取最大值  |
| `tl.atomic_min(ptr, val, mask)`  | 原子取最小值  |
| `tl.atomic_cas(ptr, cmp, val)`   | 原子比较并交换 |
| `tl.atomic_xchg(ptr, val, mask)` | 原子交换    |
| `tl.atomic_and(ptr, val)`        | 原子按位与   |
| `tl.atomic_or(ptr, val)`         | 原子按位或   |
| `tl.atomic_xor(ptr, val)`        | 原子按位异或  |
### 2.10 扫描/排序操作 API（Scan/Sort Ops）

| API                                            | 作用             |
| ---------------------------------------------- | -------------- |
| `tl.cumsum(input, axis)`                       | 沿轴计算累积和        |
| `tl.cumprod(input, axis)`                      | 沿轴计算累积积        |
| `tl.associative_scan(input, axis, combine_fn)` | 使用自定义组合函数的关联扫描 |
| `tl.sort(input, dim)`                          | 排序             |
| `tl.histogram(input, num_bins)`                |                |
### 2.11 迭代器 API（Iterators）

| API                                 | 作用                   |
| ----------------------------------- | -------------------- |
| `tl.range(start, end, step)`        | 动态范围迭代器（循环边界可在运行时确定） |
| `tl.static_range(start, end, step)` | 静态范围迭代器（编译时展开循环）     |
### 2.12 编译器提示与调试 API（Compiler Hints & Debug）

| API                            | 作用                   |
| ------------------------------ | -------------------- |
| `tl.assume(cond)`              | 向编译器提供条件成立的提示        |
| `tl.multiple_of(x, values)`    | 提示编译器 x 是 values 的倍数 |
| `tl.max_contiguous(x, values)` | 提示编译器 x 的最大连续元素数     |
| `tl.max_constancy(x, values)`  | 提示编译器 x 的最大恒定值数      |
| `tl.debug_barrier()`           | 调试屏障                 |
| `tl.device_print(msg)`         | 设备端打印（调试用）           |
| `tl.device_assert(cond)`       | 设备端断言                |
| `tl.static_print(msg)`         | 编译时打印                |
| `tl.static_assert(cond)`       | 编译时断言                |
### 2.13 随机数 API（Random）

| API                                         | 作用              |
| ------------------------------------------- | --------------- |
| `tl.rand(seed, offset)`                     | 生成均匀分布随机数       |
| `tl.randn(seed, offset)`                    | 生成标准正态分布随机数     |
| `tl.randint(seed, offset)`                  | 生成随机整数          |
| `tl.rand4x` / `tl.randn4x` / `tl.randint4x` | 生成 4 个随机数的向量化版本 |
最后的输出都是offset张量的形状
seed为常规种子数
offset为张量
**注意**
随机数都是通过 `seed+offset[i][j]`进行偏移,所以`offset_x[None, :] + offset_y[:, None] * N`需要N来保护唯一性质

## 第三部分： @triton.autotune自动调优
### 2.1 自动调优的工作原理

Triton 的自动调优是一个**运行时启发式搜索**过程，其完整流程如下：
1. **首次调用内核时**：autotuner 拦截调用，不会立即执行用户指定的配置
    
2. **遍历候选配置**：对 `configs` 列表中的每个 `triton.Config`，调用 `grid(meta)` 计算 grid 大小，编译并启动内核
    
3. **基准测试**：每个配置运行多次（受 `warmup` 和 `rep` 控制），记录运行时间
    
4. **选择最优配置**：选择耗时最短的配置，缓存该配置
    
5. **后续调用**：如果 `key` 中指定的参数值未变化，直接使用缓存的最优配置
    
调优的代价是**首次编译时间增加**（每个候选配置都需要编译和运行一次），但换来的是接近手写内核的运行时性能。
### 2.2 `triton.Config` 的完整参数
```python

triton.Config(
    kwargs={'BLOCK_SIZE': 128},   # 传给内核的 meta 参数（作为关键字参数）
    num_warps=4,                  # 每个 Program 的 warp 数量（4 * 32 = 128 线程）
    num_stages=3,                 # 软件流水线阶段数（矩阵乘法 SM80+ 上生效）
    num_ctas=1,                   # 块簇大小（仅 SM90+ 支持）
    maxnreg=None,                 # 每线程最大寄存器数（PTX .maxnreg 指令）
)
```

### 2.3 `@triton.autotune` 的完整参数

```python
@triton.autotune(
    configs=[...],                    # 候选配置列表（必填）
    key=['M', 'N', 'K'],             # 触发重新调优的参数名列表
    prune_configs_by=None,            # 配置剪枝策略（可选）
    reset_to_zero=None,               # 调优前需重置为零的张量参数名
    restore_value=None,               # 调优后需恢复原值的张量参数名
    pre_hook=None,                    # 内核调用前的自定义钩子
    post_hook=None,                   # 内核调用后的自定义钩子
    warmup=25,                        # 预热时间（毫秒）
    rep=100,                          # 重复测量时间（毫秒）
    use_cuda_graph=False,             # 是否使用 CUDA Graph 加速测量
    cache_results=False,              # 是否将调优结果缓存到磁盘
    do_bench=None,                    # 自定义基准测试函数
)
```
#### `key` 参数
`key` 是一个**参数名列表**，当这些参数的值发生变化时，autotuner 会**重新遍历所有配置**进行调优。例如 `key=['M', 'N', 'K']` 意味着：当矩阵形状改变时，重新搜索最优配置[](https://triton.hyper.ai/docs/python-api/triton/triton_autotune/)。

**为什么需要 key？** 因为同一个内核可能被用于不同大小的矩阵。小矩阵适合小块配置，大矩阵适合大块配置。通过 key 触发重新调优，可以确保每个形状都使用最适合的配置。

#### 完整案例
```python
# Step 1: 定义候选配置列表
def get_configs():
    return [
        triton.Config({'BLOCK_SIZE': 256}, num_warps=2, num_stages=2),
        triton.Config({'BLOCK_SIZE': 512}, num_warps=4, num_stages=3),
        triton.Config({'BLOCK_SIZE': 1024}, num_warps=4, num_stages=4),
        triton.Config({'BLOCK_SIZE': 2048}, num_warps=8, num_stages=4),
        triton.Config({'BLOCK_SIZE': 4096}, num_warps=8, num_stages=5),
    ]
# Step 3: 应用 autotune 装饰器
@triton.autotune
(
    configs=get_configs(),               # 候选配置
    key=['N'],                           # N 变化时重新调优
    prune_configs_by={'early_config_prune': prune_fn},  # 剪枝
    warmup=25,                           # 预热 25ms
    rep=100,                             # 测量 100ms
    cache_results=True,                  # 缓存调优结果
)
@triton.jit
add_kernel_autotuned()
# Step 4: 调用时使用 lambda grid
def vector_add_autotuned(x, y):
    N = x.numel()
    out = torch.empty_like(x)
    grid = lambda meta: (triton.cdiv(N, meta['BLOCK_SIZE']),)  # ← lambda grid
    add_kernel_autotuned[grid](x, y, out, N)
    return out
#获取最佳配置 列表
print(layer_norm1.best_config)
```

## 第四部分：性能测试
`triton.testing` 模块提供了 Triton 算子开发和评测的完整工具链：**数值验证**（`assert_close`）、**性能基准测试**（`do_bench`）和**可视化性能报告**（`perf_report` + `Benchmark`）[](https://triton-lang.org/main/python-api/triton.testing.html)。
### 3.1 `triton.testing.do_bench` — 精确的性能基准测试

#### 函数签名
```python
triton.testing.do_bench(
    fn,                          # 要基准测试的函数（lambda 或 callable）
    warmup=25,                   # 预热时间（毫秒）
    rep=100,                     # 重复测量时间（毫秒）
    grad_to_none=None,           # 需要在每次运行前清空梯度的张量列表
    quantiles=None,              # 返回分位数（如 [0.2, 0.5, 0.8]）
    return_mode='mean',          # 返回值模式："mean"、"median"、"min"、"max"、"all"
)
# 计算吞吐率
bytes_processed = x.numel() * x.element_size() * 3   
gb_per_sec = bytes_processed / (ms * 1e-3) / 1e9
```

#### 参数详解

|参数|类型|默认值|说明|
|---|---|---|---|
|`fn`|`Callable`|必填|要测试的函数，通常用 `lambda: kernel[grid](...)` 包装|
|`warmup`|`int`|25|预热时间（毫秒），控制正式计时前的运行时长|
|`rep`|`int`|100|测量时间（毫秒），控制计时运行的总时长|
|`grad_to_none`|`list[Tensor]`|`None`|每次运行前将指定张量的梯度置为 `None`，避免梯度累积影响计时|
|`quantiles`|`list[float]`|`None`|返回指定分位数而非单一统计量，例如 `[0.2, 0.5, 0.8]`|
|`return_mode`|`str`|`'mean'`|统计量模式：`"mean"`、`"median"`、`"min"`、`"max"`、`"all"`|

返回值：当 `return_mode` 为 `"mean"` 或 `"median"` 时返回单个浮点数（毫秒）；当 `quantiles` 被设置或 `return_mode="all"` 时返回浮点数列表[](https://triton-lang.org/main/python-api/generated/triton.testing.do_bench.html)。

### 3.2 `triton.testing.assert_close` — 数值一致性验证

#### 函数签名

python
```python
triton.testing.assert_close(
    x,          # 第一个输入
    y,          # 第二个输入
    atol=1e-2,  # 绝对容差（默认 1e-2）
    rtol=0,     # 相对容差（默认 0）
    err_msg='', # 断言失败时的自定义错误消息
)
```
**容差选择建议**：

|数据类型|推荐 atol|推荐 rtol|
|---|---|---|
|float32|1e-5 ~ 1e-4|1e-5 ~ 1e-4|
|float16|1e-3 ~ 1e-2|1e-3 ~ 1e-2|
|bfloat16|1e-2|1e-2|
|int|0（精确匹配）|0|
### 3.3 `triton.testing.perf_report` + `triton.testing.Benchmark` — 可视化性能报告

这是 Triton 中最强大的性能评测工具，可以**声明式地定义多曲线性能图表**，自动生成折线图、CSV 和 HTML 报告。

#### `Benchmark` 类的参数
```python
@triton.testing.perf_report(  
    [  
        triton.testing.Benchmark(
        x_names=['N'],                                          # X 轴变量名
        x_vals=[2**i for i in range(10, 28)],                   # X 轴取值
        line_arg='provider',                                     # 区分曲线的参数
        line_vals=['triton', 'torch'],                           # 两条曲线
        line_names=['Triton', 'PyTorch'],                        # 曲线显示名
        styles=[('blue', '-'), ('green', '--')],                 # 曲线样式
        ylabel='GB/s',                                           # Y 轴标签
        plot_name='vector-add-performance',                      # 图表名称
        args={},                                                 # 额外参数
    )
])
==================
#函数接收x_names（封装了x_vals的数组），line_arg（封装了line_vals的字符串）
def bench(N, provider):
    x = torch.randn(N, device='cuda')
    y = torch.randn(N, device='cuda')
    if provider == 'triton':
        fn = lambda: triton_add(x, y)
    else:
        fn = lambda: x + y
    ms = do_bench(fn)          # ★ 显式调用 do_bench 测量
    #后端分配调用line_vals，返回值一个个加入到y当中
    return bytes / ms / 1e6    # ★
# N的值由x_vals来确定  provider的值由line_vals确定  图像y的值为返回值
benchmark.run(
    show_plots=True,       # 是否弹出 matplotlib 窗口显示折线图
    print_data=True,       # 是否打印数据表格到控制台
    save_path='./results', # 结果保存路径（生成 .png 和 .csv）
)
```