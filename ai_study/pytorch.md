先导路线图
![[Pasted image 20260916202623.png|267]]
# 深度学习的四个特点
![[Pasted image 20260916211659.png]]

# 张量

## 张量的基本创建
### 标准张量
```python
torch.tensor(data,dtype)   根据指定数据创建张量
torch.Tensor(size)   根据形状创建张量
torch.IntTensor  torch.FloatTensor  
```
三者区别，tensor使用最多，只有两个参数，data=（list,np）,dtype=torch.(int,float,double)
### 特殊张量
```python
torch.ones(2,3)   torch.ones_like(tensor,)
torch.zeros(2,3)  torch.zeros_like(tensor)
torch.full(size=(2,3),fill_value=255)  torch.full_like()
```
### 随机张量
```python
torch.arange(start,stop,step)   torch.linspace(start,stop,size)#线性等差
torch.manual_seed()  #设置种子
torch.rand/randn(size,dtype) #均匀分布，正态分布
tourch.randint(low,high,size=()) 
```
### 张量数据类型
```python
newdata=data.type(torch.half/float/double/short/int/long)
newdata=data.half()...long()
```

## 张量的基本运算
### 张量与Numpy互转
```python
#张量转numpy
ts1.numpy()   #共享内存修改一个值同时修改两个
ts1.numpy().copy() #独立开辟空间

#numpy转张量
ts1=torch.tensor(np数组)

#单个tensor转单个变量
ts1=torch.tensor(10)
value=ts1.item()
```
### 基本运算
```python
#对应数据进行运算
+ - * /  // %

#矩阵乘法
torch.matmul()
@
```
### 运算函数
```python
sum() max()  min()  mean()  #拥有dim参数 dim=0列求  dim=1行求
pow() sqrt() exp()  log() log2()  log10()
```
### 截取张量
``` python
#简单行列截取
t1[1:2,1:2]  行start：行end，列start：列end
#截取单个元素****
t1[[1,3],[2,4]]  截取(1,2)和(3,4)的元素  前面表示行 后面表示列    
```
### 张量形状
```python
data.reshape(row,columns)   #按照数据的顺序进行重排序

data.view(row,columns)  #只能处理连续张量

data.contiguous()  #把逻辑上不连续的张量 改为与物理顺序一致

data.is_contiguous() #判断张量逻辑与物理顺序是否一致

data.unsqueeze(x)  #增加维度

data.squeeze()   #删除维度为1

data.transpose(dim0:,dim1) #指定维度

data.permute(1,2,3)  #维度参数
```
### 张量拼接
```python
tr3=torch.cat([tr1,tr2],dim=0)  #处了拼接维度，其他维度必须保持一致

tr3=torch.stack([tr1,tr2],dim=0) #所有维度保持一致
```

### 自动求导
``` python
w=torch.tensor(10,requires_grad=True,dtype=torch.float)
#自动求导
loss.backward()  
#获取梯度
w.grad
```
#### 迭代梯度标准写法
```python
if w.grad is not None:
        w.grad.zero_()      # 或者 w.grad = None
    loss = w ** 2 + 20
    loss.backward()
    with torch.no_grad():
        w -= lr * w.grad
    print(f'{x:.2f}')
```
## 张量变形 
重中之重的关键知识
- **改变形状不改变维度顺序**：`view()`、`reshape()`、`flatten()`、`ravel()`
    
- **增减维度**：`squeeze()`、`unsqueeze()`
    
- **交换维度**：`transpose()`、`permute()`
    
- **扩展张量**：`expand()`、`repeat()`
    
- **内存连续化**：`contiguous()`
## 变形api详解

### API 1：`view()` —— 改变形状（要求内存连续）

**功能**：返回一个与原始张量数据相同但形状不同的新张量。返回的张量与原始张量共享底层数据，元素总数必须相同。

**关键限制**：新视图必须与原始张量的 size 和 stride 兼容。如果不兼容，则无法在不复制的情况下执行 `view()`，需要先调用 `contiguous()`。

**参数**：`*shape`（`torch.Size` 或 `int...`），`-1` 表示自动推断该维度大小。

**与 `reshape()` 的区别**：当不确定 `view()` 是否可以执行时，建议使用 `reshape()`，它在形状兼容时返回视图，否则执行复制。
### API 2：`reshape()` —— 改变形状（更灵活）

**功能**：与 `view()` 类似，但 `reshape()` 可以处理更复杂的维度变换，它会自动处理内存不连续的情况——如果形状兼容则返回视图，否则复制数据（等同于先调用 `contiguous()` 再 `view()`）。

**参数**：`*shape`（`torch.Size` 或 `int...`），同样支持 `-1` 自动推断。

**与 `view()` 的核心区别**：

- 连续张量：两者行为完全相同，返回共享内存的视图。
    
- 非连续张量：`view()` 报错，`reshape()` 会复制数据并返回新张量。
### API 3：`transpose()` —— 交换两个维度

**功能**：交换张量的两个维度。在二维情况下相当于矩阵转置。不改变元素数量和值，只是改变元素在张量中的排列顺序。[](https://developer.aliyun.com/article/1544626#1)

**参数**：`dim0`（int），`dim1`（int）—— 要交换的两个维度索引。

**返回值**：新张量，通常产生非连续张量。

**注意**：只适用于交换两个维度，对于更高维度的多维度交换应使用 `permute()`。

### API 4：`permute()` —— 重新排列所有维度

**功能**：可以一次交换更多的维度，接受一个元组作为参数，表示新的维度顺序。[](https://developer.aliyun.com/article/1544626#1)[](https://cloud.tencent.com.cn/developer/article/2409734?from=15425#1)

**参数**：`dims`（tuple of int）—— 新的维度排列顺序。

**返回值**：新张量，通常产生非连续张量。

### API 5：`squeeze()` —— 移除大小为1的维度

**功能**：压缩张量中维度为1的轴。

**参数**：`dim`（可选，int）—— 指定要移除的维度；如果不指定，则移除所有大小为 1 的维度。

**注意**：如果张量有批量维度大小为 1，`squeeze()` 也会移除批量维度，这可能导致意外错误，建议指定 `dim` 参数。
### API 6：`unsqueeze()` —— 在指定位置插入新维度

**功能**：在指定维度上增加一个维度（大小为 1）。

**参数**：`dim`（int）—— 要插入新维度的位置。

**应用场景**：大多数 PyTorch 模型期望一个批次的数据作为输入，当只有单个数据样本时，可以应用 `unsqueeze()` 添加批次维度。
### API 7：`flatten()` —— 展平连续维度

**功能**：将多维张量展平为一维或指定范围的维度。参数指定了展平的起始和结束维度。`flatten(start_dim=0)` 会将整个张量展平为一维；`flatten(start_dim=1)` 会保留第0维（通常是批次维度），展平其余维度。
### API 8：`expand()` —— 广播扩展（不复制数据）

**功能**：在某维度上进行数据扩展，通过在维度上复制原始数据实现。但 `expand()` 不会实际复制内存，只是创建一个视图。

**参数**：`*sizes` —— 目标形状，`-1` 表示保持原维度不变。

**限制**：只能扩展大小为 1 的维度。
### API 9：`repeat()` —— 重复扩展（复制数据）

**功能**：沿指定维度重复张量的元素。与 `expand()` 不同，`repeat()` 会实际分配新内存。

**参数**：`*sizes` —— 每个维度的重复次数。

### API 10：`contiguous()` —— 强制内存连续

**功能**：将非连续张量转换为内存连续的张量。如果张量已经是连续的，则返回自身；否则复制数据并返回新的连续张量。

**核心作用**：解决“非连续张量无法使用 `view()`、计算效率低”的问题。连续内存布局减少了 CPU 对内存的请求次数。

**典型场景**：`transpose()` 或 `permute()` 后调用 `contiguous()` 再 `view()`。

### 4. 可扩展应用点

1. **`view()` vs `reshape()` 的性能选择**：在确定张量连续时优先使用 `view()`，因为它避免数据复制，零拷贝操作更高效。不确定时使用 `reshape()` 以保证正确性，但要注意它可能触发隐式内存复制。
    
2. **`permute()` + `contiguous()` + `view()` 的经典组合**：`permute()` 后张量通常不连续，如果后续需要 `view()`，必须先调用 `contiguous()`。典型场景包括将 `(N, C, H, W)` 转为 `(N, H, W, C)` 后展平用于注意力机制。
    
3. **`unsqueeze()` 解决批次维度问题**：当只有单个数据样本时，用 `unsqueeze(0)` 添加批次维度以适配模型输入要求。
    
4. **`expand()` 的广播妙用**：在计算距离矩阵、注意力分数等场景中，`expand()` 可以零拷贝地扩展张量维度，配合广播机制实现高效计算。
    
5. **`squeeze()` 的陷阱与防御**：`squeeze()` 不指定维度时可能意外移除批次维度，建议始终显式指定 `dim` 参数。在做 reduction 操作或使用 `torch.squeeze` 时总是指定好维度。
    
6. **`flatten()` 用于全连接层适配**：从卷积层到全连接层的过渡中，使用 `flatten(1)` 保留批次维度同时展平特征维度，这是 CNN 中最常见的形状变换操作。
    
7. **常见错误与调试**：最常见的形状错误是 `RuntimeError: shape '[2, 3]' is invalid for input of size 10`，即形状的元素总数不匹配。解决方法包括：检查张量大小、使用 `-1` 自动推断维度、以及确保数据兼容性。可使用 `torchinfo.summary()` 打印每层的输入输出形状快速定位问题。
    
8. **与其他知识点的联系**：数据变形与广播机制紧密相关——广播允许不同形状的张量自动扩展为相同尺寸而不复制数据。此外，`view()` 和 `permute()` 在 Transformer 的 Multi-Head Attention 中用于将 `(batch, seq_len, d_model)` 拆分为多个注意力头。
## API

## 地址类API
### 判断原地操作的 API：`Tensor.data_ptr()`

**功能**：返回张量底层数据的内存地址（整数）。如果两个张量的 `data_ptr()` 相同，说明它们共享同一块内存。

**参数**：无。

**返回值**：`int`，内存地址。

### 判断视图关系的 API：`Tensor._base`

**功能**：如果张量是某个张量的视图，`_base` 指向原始张量；如果是独立张量，`_base` 为 `None`。

**返回值**：`Tensor` 或 `None`。

### 判断内存连续的 API：`Tensor.is_contiguous()`

**功能**：判断张量在内存中是否连续存储。这个在后面问题 2 会详细讲。
## 封装Attention API
**`torch.nn.functional.scaled_dot_product_attention` (SDPA)**：这是 PyTorch 2.0+ 中最重要的底层注意力函数。它接收已经投影好的 Q、K、V 张量，直接计算缩放点积注意力，并能根据输入和 GPU 类型**自动选择最高效的后端实现**（如 FlashAttention、Memory-Efficient Attention 或纯数学计算）