"""
给你一个正整数数组 price ，其中 price[i] 表示第 i 类糖果的价格，另给你一个正整数 k 。

商店组合 k 类 不同 糖果打包成礼盒出售。礼盒的 甜蜜度 是礼盒中任意两种糖果 价格 绝对差的最小值。

返回礼盒的 最大 甜蜜度。
"""
def maximumTastiness(price: list[int], k: int) -> int:
    price.sort()
    def check(d):
        count = 1
        last=price[0]
        for i in range(1,len(price)):
            if price[i]-last>=d:
                count+=1
                last=price[i]
                if count==k:
                    return True
        return False
    left=0
    right=price[-1]-price[0]
    while left<right:
        mid=(left+right+1)//2
        if check(mid)==True:
            left=mid
        else:
            right=mid-1
    return left


print(maximumTastiness(price = [13,5,1,8,21,2], k = 3))