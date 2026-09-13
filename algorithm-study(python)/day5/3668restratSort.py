"""
给你一个长度为 n 的整数数组 order 和一个整数数组 friends。

order 包含从 1 到 n 的每个整数，且 恰好出现一次 ，表示比赛中参赛者按照 完成顺序 的 ID。
friends 包含你朋友们的 ID，按照 严格递增 的顺序排列。friends 中的每个 ID 都保证出现在 order 数组中。
请返回一个数组，包含你朋友们的 ID，按照他们的 完成顺序 排列。
"""


def recoverOrder(order: list[int], friends: list[int]) -> list[int]:
    res=[]
    for i in friends:
        res.append(order.index(i))
    resoce=[]
    res.sort()
    for re in res:
        resoce.append(order[re])
    return resoce
print(recoverOrder(order=[3,1,2,5,4],friends=[1,3,4]))

