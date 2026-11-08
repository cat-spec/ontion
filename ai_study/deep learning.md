[[pytorch]][[CIFAR10训练集与MNIST训练集]]
# 神经网络
# 路线图规划
1.初步了解深度学习 ann cnn rnn 
2.主流模型架构transformer resnet 
3.大模型基础Hugging Face + vLLM 主推理  初步速成学习
4.Ai agent开发 LangChain MCP      初步速成学习
最迟10月底
结束ai 大模型学习开启ai infra

### W权重
#### 为什么一开始是随机数？

随机初始化只是为了**给模型一个起点**，并且打破神经元之间的对称性。如果所有 w 都一样，很多神经元会学到一样的东西。

刚开始随机时，输出当然没什么意义。真正有意义的是：训练过程中，通过损失函数和反向传播，不断调整 w，让它变成有用的权重。

所以可以记成：

> 随机初始化只是起点，w 的最终值才是模型学到的知识。
#### w 的作用

w 决定每个输入特征对输出的影响：

- w 大：这个输入很重要；
    
- w 小：这个输入不太重要；
    
- w 正：这个输入增大，输出倾向增大；
    
- w 负：这个输入增大，输出倾向减小。


# 激活函数

### sigmoid
![[Pasted image 20260919092229.png|359]]
![[Pasted image 20260919094928.png]]

该激活函数用于浅层（<5）,二分类中

### tanh激活函数
  ![[Pasted image 20260919095900.png]]
### ReLU激活函数
![[Pasted image 20260919100448.png]]

### softMax激活函数
![[Pasted image 20260919102111.png]]


![[Pasted image 20260919102027.png]]
### SwiGLU
![[Pasted image 20261101215814.png]]


# 参数初始化
### 均匀分布初始化
nn.init.uniform_()
### 正态分布初始化
nn.init.normal_()
### 全0全1固定值
nn.init.zeros_() /ones_() / constant_()
### kaiming初始化
nn.init.kaiming_normal_()
nn.init.kaiming_uniform_()

### xavier初始化
nn.init.xavier_normal_()
nn.init.xavier_uniform_()

![[Pasted image 20260919104129.png]]

# 数据集
**数据集（Dataset）→ 变换（transforms）→ 采样（Sampler）→ 批量加载（DataLoader）**
### 数据集
```python
import torchvision.datasets as datasets
import torchvision.transforms as transforms
# 数据集位置 ，训练集，是否需要下载，数据初始化
train_dataset=datasets.MNIST(datasets_path,train=True,download=False,transform=transform)
#查看数据元信息
len(train_dataset)
train_dataset.data
train_dataset.targets
train_dataset.class_to_idx #类别名-》索引
```
### 变化
预处理 + 数据增强
```python
from torchvision import datasets, transforms
`transforms` 中的每个变换都是一个**可调用对象**：先构建实例，再对图像调用。多个变换用 `Compose` 串成流水线，依次执行。
transform = transforms.Compose([
    transforms.Resize((224, 224)),        # 统一尺寸
    transforms.ToTensor(),                 # PIL/NumPy → Tensor，同时 [0,255] → [0,1]
    transforms.Normalize(mean, std),       # 逐通道标准化
])

```
### 采样
控制“按什么顺序取哪些样本

### 加载
```python
from torch.utils.data import DataLoader
dataloader=DataLoader(dataset, batch_size=1, shuffle=False, sampler=None,
           batch_sampler=None, num_workers=0, collate_fn=None,
           pin_memory=False, drop_last=False, timeout=0,
           worker_init_fn=None, prefetch_factor=2, persistent_workers=False)
dataloader.dataset #原始数据
next(iter(dataloader)) #当前一批大小的数据

```

|参数|作用|典型设置|
|---|---|---|
|`batch_size`|每批样本数|32/64/128|
|`shuffle`|每个 epoch 是否打乱顺序|训练集 `True`，验证/测试 `False`|
|`num_workers`|子进程数，0 表示主进程加载|从 0 开始，慢时逐步增加|
|`drop_last`|样本数不能被 `batch_size` 整除时，是否丢掉最后一批|训练时常用 `True` 避免 BN 问题|
|`pin_memory`|将 batch 放入锁页内存，加速 CPU→GPU 拷贝|GPU 训练时 `True`|


# 神经网络搭建
```python
class ModelDemo(nn.Module):  
    def __init__(self):  
        super().__init__()  
        self.linear1 = nn.Linear(3, 3)  
        self.linear2 = nn.Linear(3, 2)  
        self.output = nn.Linear(2,2)  
        nn.init.xavier_normal_(self.linear1.weight)  
        nn.init.zeros_(self.linear1.bias)  
        nn.init.kaiming_normal_(self.linear2.weight)  
        nn.init.zeros_(self.linear2.bias)  
    def forward(self,x):  
        x1=self.linear1(x)  
        x2=torch.sigmoid(x1)  
  
        x3=self.linear2(x2)  
        x4=torch.relu(x3)  
  
        x5=self.output(x4)  
        x6=torch.softmax(x5,dim=1)  
  
        return x6

```

# 训练轮次批次数

**epoch** = 把整个数据集完整过多少轮。  
**batch_size** = 每个批次包含多少张图片。  
**batch** = `ceil(总样本数 / batch_size)`。  
**知道两个就可以推出第三个**。
内循环次数决定参数更新次数
- **外循环**跑 1 次 = 模型看了 50000 张图（1 个 epoch）。
- **内循环**跑 1 次 = 模型看了 2048 张图（1 个 batch），更新一次参数。


# 损失函数
### 多分类交叉熵损失
```python
loss=nn.CrossEntropyLoss()
```
![[Pasted image 20261029145522.png]]
![[Pasted image 20261029145843.png]]
### 二分类任务损失函数
```python
loss=nn.BCELoss()
```
### MAE与MSE
``` python
#MAE损失函数
#|真实值-预测值| 求和 * 1/n
loss=nn.L1Loss()
**优缺点**：
- **优点**：**对异常值鲁棒**。少数离群点不会颠覆模型的学习方向。[](https://kaiwu.qboson.com/forum.php?mod=viewthread&action=printable&tid=693)  
- **缺点**：在零点（误差为 0）处**不可导**，给基于梯度的优化带来麻烦；且梯度恒定，在最优解附近容易“震荡”，难以精细收敛。

#MSE损失函数
#（真实值-预测值）^2 求和 * 1/n
loss=nn.MSELoss()
**优缺点**：
- **优点**：处处可导，优化性质良好，在最优解附近梯度会平滑减小，收敛稳定。 
- **缺点**：**对异常值极度敏感**。一个极端的离群点会主导整个损失，把决策边界“拉偏”，损害模型在正常数据上的表现。
```

# 梯度下降优化
### 动量法
```python
#参数一需要更新的权重  lr学习率  momentum参数
optimizer=optim.SGD(params=[w],lr=0.01,momentum=0.9)
```
### AdaGrad
```python
optimizer=optim.AdaGrad(lr=0.01)
```
### RMSProp
```python
optimizer=optim.RMSProp(params=[w],lr=0.01,alpha=0.9)
```
### Adam
```python
optimizer=optim.Adam(params=[w],lr=0.01,betas=(0.9,0.999))
```
![[Pasted image 20260920103302.png]]
# 学习率优化
### 手动固定间隔学习率调整
lr=lr×gamma
```python
sc_lr=optim.lr_scheduler.StepLR(optimizer,step_size=50,gamma=0.5)
```
### 指定间隔学习率
```python
#milestones=[100,150,200]
sc_lr=optim.lr_scheduler.MultisStepLR(optimizer,milestones,gamma=0.1)
```
### 指数学习率衰减
```python
sc_lr=optim.lr_scheduler.ExponentialLR(optimizer,gamma)
```
![[Pasted image 20260920112207.png]]

# 过拟合欠拟合
### 正则化
### 随机失活，留存的进行缩放
每个神经元p概率死亡，没死亡的神经元进行× 1/1-p
控制过拟合
```python
#处理时间为 全连接的 激活函数后进行 随机失活
#Dropout   
#Dropout1d
#Dropout2d
#Dropout3d
p是失活概率，也就是为0的概率
dropout=nn.Dropout(p=0.4)
x=dropout(x)
====================
#底层实现
q = 1.0 - p
mask = (torch.rand_like(h) < q).to(h.dtype)  # 伯努利掩码
return mask * h / q  # 存活

```
### 批量归一化
```python
# BatchNorm1d 全连接层，处理一维数据 （N,num_features）
# BatchNorm2d 卷积层之后，二维或者特征图 (n,c,h,w)
# BatchNorm3d

dn=nn.BatchNorm2d(num_deatures=2,eps=1e-5,momentum=0.1,affine=True)
```
![[Pasted image 20260920203433.png]]


# 卷积神经网络
卷积层：提取图像局部特征
池化层：大幅降低参数量 降维
全连接层：输出结果
## 卷积神经网络的构成

卷积核与每一组通道点乘求和，算出的卷积核

![[Pasted image 20260921100758.png]]
特征图的计算
![[Pasted image 20260921102334.png]]

### 填充
![[Pasted image 20260921095236.png]]
### 步长
![[Pasted image 20260921095741.png]]

### 卷积层api

### 卷积步骤
1.读取图片，规范图片维度tensor 
```python
img=img.permute(2,0,1)
img=img.unsqueeze(0)
#img=(num,wight,height,channel)  图片数量，宽，高，通道
```
2.初始化卷积层
```python
#in_channels out_channels kernel_size stride padding
conv=nn.Conv2d(3,3,3,1,0)
conv_img=conv(img)   
#img维度必须满足 (N, C_in, H, W)
含义：

- `N`：batch size，一次处理几张图
    
- `C_in`：输入通道数，RGB 图是 3
    
- `H`：高
    
- `W`：宽
```
## 池化层构成

更加池化核，去做运算

![[Pasted image 20260921112424.png]]

### 最大池化
选取池化核中最大的值
### 平均池化
选取池化核中值的和的平均值

## 池化层api
池化层可以接受 `(3, H, W)`，它也能接受 `(N, C, H, W)`。
```python
# 初始化最大池化层
#池化核大小  步长  填充
pool1=nn.MaxPool2d(2,1,0)
pool=pool1(img)
#平均池化层
#池化核大小  步长  填充
pool1=nn.AvgPool2d(2,1,0)
pool=pool1(img)
```

## Cifar项目整体

# 循环神经网络

## 词嵌入层
```python

```

## 循环网络层
```python

```

# Transformer架构
1.提升并行处理任务的能力
2.提升长距离依赖建模能力 
## 架构图
![[Pasted image 20260923142417.png]]
## 位置编码

## 注意力
### 自注意机制
![[Pasted image 20260923150512.png]]
![[Pasted image 20260923151518.png]]
问题
1.vi有什么作用
2.bi的信息含义：当前i词与所有词的关联程度
3.

### 多头注意力机制
![[Pasted image 20260923153524.png]]
### 掩码注意力机制
![[Pasted image 20260923154733.png]]
问题
1.为什么序列长度一致，gpu并行运算就高效

## 层归一化，残缺化

## 前馈神经网络


