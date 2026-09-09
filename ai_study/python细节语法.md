# 推到式运用
### 列表推导式
```
带筛选：只要偶数，且算出平方
even_squares = [i * i for i in range(5) if i % 2 == 0]
# 正确写法（三元写在左边，不过滤）：
[x if x % 2 == 0 else -1 for x in range(5)]  # [0, -1, 2, -1, 4]
```
```推导式底层逻辑
# 等价于 (执行顺序：先 i=0，再 i=1，再 i=2)
squares = []
for i in range(3):
    squares.append(i*i)
```
如果有max等都是传入一个处理一个。所有应该是二位数组才能使用
```
max=[max(i) for i in grid]
```
字典推导式
```
original = {'name': '小明', 'age': 18}
# 推导式（这里 for 左边有 k, v 两个变量）
new_dict = {v: k for k, v in original.items()}
# 结果：{'小明': 'name', 18: 'age'}
```
**对应关系**：`original.items()` 每次吐出 `('name', '小明')`，Python 不管它叫 `k,v` 还是 `x,y`，只管**按顺序**把 `'name'` 塞给第一个变量，把 `'小明'` 塞给第二个变量。

# 