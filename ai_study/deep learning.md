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

# 学习率优化
