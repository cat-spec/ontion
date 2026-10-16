x = 0

def outer():      # 只对 outer 生效
    x = 1

    def inner():
        x = 2      # inner 没写 global，这里创建的是 inner 的局部变量
        print(x)   # 2

    inner()
    print(x)       # 1，outer 里的 x 是全局 x

outer()
print(x)           # 1