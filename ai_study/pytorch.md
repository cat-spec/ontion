先导路线图
![[Pasted image 20260916202623.png|267]]
# 深度学习的四个特点
![[Pasted image 20260916211659.png]]

# 张量
难点：3维以上截取，torch.stack()

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