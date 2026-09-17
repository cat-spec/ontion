"""
给你一个长度为 n 的整数数组 nums 。对于 每个 下标 i（0 <= i < n），定义对应的子数组 nums[start ... i]（start = max(0, i - nums[i])）。

返回为数组中每个下标定义的子数组中所有元素的总和。

子数组 是数组中的一个连续、非空 的元素序列。

*** 无思路最优解
"""

def subarraySum(nums: list[int]) -> int:
    front_sum=[]
    sum=0
    for num in range(0, len(nums)):
        sum+=nums[num]
        front_sum.append(sum)
    result=nums[0]
    re=start=0
    for i in range(1, len(nums)):
        start=max(re,i-nums[i])
        if start==0:
            result+=front_sum[i]
        else: result+=front_sum[i]-front_sum[start-1]
    return result


print(subarraySum(nums=[2,3,1]))
