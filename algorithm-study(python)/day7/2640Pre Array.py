"""
定义一个数组 arr 的 转换数组 conver 为：

conver[i] = arr[i] + max(arr[0..i])，其中 max(arr[0..i]) 是满足 0 <= j <= i 的所有 arr[j] 中的最大值。
定义一个数组 arr 的 分数 为 arr 转换数组中所有元素的和。

给你一个下标从 0 开始长度为 n 的整数数组 nums ，请你返回一个长度为 n 的数组 ans ，其中 ans[i]是前缀 nums[0..i] 的分数。

"""

def findPrefixScore(nums: list[int]) -> list[int]:
    conver=0
    sum=0
    res=[]
    for i,j in enumerate(nums):
        conver=max(conver,j)
        sum+=conver+j
        res.append(sum)
    return res
print(findPrefixScore([2,3,7,5,10]))