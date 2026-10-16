```
┌─────────────────────────────────────────────────────────┐
│                   你的 CNN Demo 全流程                   │
├─────────────────────────────────────────────────────────┤
│  1. 数据                                                  │
│     MNIST/CIFAR → ToTensor → Normalize → Dataset         │
│                        ↓                                  │
│     DataLoader(batch, shuffle, num_workers)              │
│                        ↓                                  │
│  2. 模型                                                  │
│     Conv+BN+ReLU+Pool ×3 → Flatten → Linear+Dropout → 10 │
│                        ↓                                  │
│  3. 训练                                                  │
│     forward → CrossEntropy → backward → step → zero_grad │
│                        ↓                                  │
│  4. 评估                                                  │
│     eval() + no_grad → argmax → acc/P/R/F1 → 混淆矩阵     │
│                        ↓                                  │
│  5. 保存                                                  │
│     best_model / last_model (含 epoch/optim/scheduler)   │
└─────────────────────────────────────────────────────────┘
```
# 导入数据

```python
transform = transforms.Compose([  
# 数据转为张量处理
    transforms.ToTensor(),  
    # x=(x-mean)/std  1.减少数据差异过大 2.避免值一下大一下小，影响梯度变化
    transforms.Normalize((0.1307,), (0.3081,))  
    # **类比**：考试分数从"0~100 分"改成"标准分（-3~3）"，不会改变排名，但让统计分析更直观。
])  
train_dataset=datasets.MNIST(datasets_path,train=True,download=False,transform=transform)

```
![[Pasted image 20260923213733.png]]
# 模型创建
``` python
self.net=nn.Sequential(  
#     数据60000 * 1 * 28 * 28  
#     第一层卷积  
    nn.Conv2d(1,16,3,padding=1),  
    nn.BatchNorm2d(16),  
    nn.ReLU(),  
    nn.MaxPool2d(2,2),  
# 第二层卷积 14*14    nn.Conv2d(16,32,3,padding=1),  
    nn.BatchNorm2d(32),  
    nn.ReLU(),  
    nn.MaxPool2d(2,2),  
#     第三次卷积池化 7*7    nn.Conv2d(32,64,3,padding=1),  
    nn.BatchNorm2d(64),  
    nn.ReLU(),  
    nn.MaxPool2d(2,2),  
    # 什么作用  
    nn.Flatten(),  
#     全连接  
    nn.Linear(576,128),  
    nn.ReLU(),  
    nn.Dropout(0.2),  
    nn.Linear(128,64),  
    nn.ReLU(),  
    nn.Linear(64,10),  
)
def forward(self,x):  
    return self.net(x)
```
# 评估训练
```python
for epoch in range(start_epoch,epochs):  
    simple_total = loss_total = acc_total=start_time = 0  
    model.train()  
    for x, y in train_loader:  
        x,y=x.to(device,non_blocking=True),y.to(device,non_blocking=True)  
       # output.shape    # [B, 10] B为该批的个数，10列是10个数分别对应类别 0~9 的"打分"，分数越高越可能是那个类。
        output=model(x)  
        # 1.对每行 `output[i]` 做 **softmax** → 得到 10 个概率
        # 2.取出**真实类别** `y[i]` 对应的那个概率
        # 3.取 `log`，取负
        # 对 batch 内 N 个样本**求平均**
        loss=loss_fun(output,y)  
        optimizer.zero_grad()  
        loss.backward()  
        optimizer.step()  
    #     数据统计  
     # loss.itme()是该批的平均损失，*len(y) 还原为总损失 后期除以总样本数
        loss_total+=loss.item()*len(y)  
        acc_total+=(torch.argmax(output,dim=1)==y).sum().item()  
        simple_total+=len(y)  
    scheduler.step()
```

# 弱点方向
## 问题一 张量变形

# 计算性能
**H1. `num_workers` 设多少？**
- Linux：`4 × GPU数` 起步
    
- Windows：从 0 开始试（多进程有坑）
    
- 太多会 OOM
    
**H2. `pin_memory=True` 什么时候用？**

- 有 GPU 时用（CPU→GPU 传输更快）
    
- 纯 CPU 训练时无效，甚至有害
    
**H3. `non_blocking=True` 什么时候用？**

- 配合 `pin_memory=True`，让传输和计算重叠
-
 **H4. ``persistent_workers=True`` 什么时候用？**
  默认情况：每个 epoch 结束，**worker 全部销毁**，下个 epoch 重新创建。

**H5.  预取`` prefetch_factor`` 什么时候用？**


# 数据可视化
## 准确率
模型预测成功个数/总个数
最重要指标 衡量模型准不准
**优点**：直观。**缺点**：类别不平衡时会骗人（比如 90% 是 cat，全猜 cat 也有 90%）。
## 精确度
预测成 k 且真的为 k 的数量 / 预测成 k 的总数量
**直觉**：模型说"这是猫"的时候，可信度有多高。

## 召回率
真的为 k 且被预测成 k 的数量 / 真的为 k 的总数量
**直觉**：所有"真猫"里，模型抓出来了多少。
## F1
F1 = 2 × P × R / (P + R)
## 混淆矩阵
行标题为真 ，列标题为假


# 新知识API

## sklearn库
sklearn的子库 评估模块
``` python 
# 只接受numpy数组
from sklearn.metrics import (accuracy_score, precision_score, recall_score,f1_score, confusion_matrix, classification_report)

# 2.1 `accuracy_score` —— 准确率
## 参数介绍  normalize=True True 返回比例(0~1)，False 返回预测对的个数
accuracy_score(y_true, y_pred, normalize=True, sample_weight=None)

# 2.2 `precision_score` —— 精确率
#**关键参数 `average`：**

#|取值|含义|适用场景|
#|---|---|---|
#|`'binary'`|只算正类（默认，仅二分类）|二分类|
#|`'micro'`|全局统计，多分类时等于 accuracy|多分类|
#|`'macro'`|每类 P 的**算术平均**|多分类（你要的）|
#|`'weighted'`|每类 P 按**样本数加权平均**|多分类（你要的）|
#|`None`|返回**每类**的 P 数组|想看每类细节|

precision_score(y_true, y_pred, labels=None, pos_label=1, average='binary', sample_weight=None, zero_division='warn')
   
### 2.3 `recall_score` —— 召回率
recall_score(y_true, y_pred, labels=None, pos_label=1, average='binary', sample_weight=None, zero_division='warn')

### 2.4 `f1_score` —— F1 值
f1_score(y_true, y_pred, labels=None, pos_label=1,
         average='binary', sample_weight=None, zero_division='warn')
         
         
### 2.5 `confusion_matrix` —— 混淆矩阵
# normalize `None`(默认，返回数量) / `'true'`(按行归一化) / `'pred'`(按列) / `'all'`(全局)
confusion_matrix(y_true, y_pred, labels=None,sample_weight=None, normalize=None)

from sklearn.metrics import ConfusionMatrixDisplay
disp = ConfusionMatrixDisplay(confusion_matrix=cm,display_labels=['cat', 'dog', 'bird'])
disp.plot(cmap='Blues')
plt.show()

### 2.6 `classification_report` —— 一表打尽输出全部信息
classification_report(y_true, y_pred, labels=None, target_names=None,
                      sample_weight=None, digits=2, output_dict=False,
                      zero_division='warn')

# digits小数位数  

#**读法**：**行=真实，列=预测，`cm[i][j]` = 真 i 被判成 j 的数量/比例。**
```



## python原生
#### extend与append区别
```python
a = [1, 2, 3]
# append：把参数当作"一个元素"加进去
a.append([4, 5])
# 结果：[1, 2, 3, [4, 5]]   ← 变成了嵌套列表，长度 4
# extend：把参数"拆开"逐个加进去
a = [1, 2, 3]
a.extend([4, 5])
# 结果：[1, 2, 3, 4, 5]     ← 扁平化，长度 5
```
## pytorch
#### nn.Sequential 和nn.Flatten()

#### .cpu和.numpy
```python
y           # torch.Tensor，在 GPU 上（因为前面 .to(device1) 了）
y.cpu()     # → torch.Tensor，搬到 CPU（numpy 只能处理 CPU 数据）
   .numpy() # → numpy.ndarray
y.detach().numpy()  #tensor张量转numpy
```
**注意**：`.numpy()` 要求张量**不能带梯度**。你的评估代码在 `with torch.no_grad():` 里，所以没问题；如果在训练循环里对 `loss` 调用 `.numpy()`，会报错，得先 `.detach()`：

