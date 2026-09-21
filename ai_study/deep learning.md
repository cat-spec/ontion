# 神经网络
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

# 损失函数
### 多分类交叉熵损失
```python
nn.CrossEntropyLoss()
```
### 二分类任务损失函数
```python
nn.BCELoss()
```
### MAE与MSE
``` python
#MAE损失函数
loss=nn.L1Loss()
#MSE损失函数
loss=nn.MSELoss()
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
#### 随机失活，留存的进行缩放
每个神经元p概率死亡，没死亡的神经元进行× 1/1-p
```python
dropout=nn.Dropout(p=0.4)
```
#### 批量归一化
```python
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