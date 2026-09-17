"""
给你一个长度为 n 的整数数组 nums 。

分区 是指将数组按照下标 i （0 <= i < n - 1）划分成两个 非空 子数组，其中：

左子数组包含区间 [0, i] 内的所有下标。
右子数组包含区间 [i + 1, n - 1] 内的所有下标。
对左子数组和右子数组先求元素 和 再做 差 ，统计并返回差值为 偶数 的 分区 方案数。

"""

def countPartitions(nums: list[int]) -> int:
    # 计算前缀和
    frontsum=[]
    sum=0
    for i in nums:
        sum+=i
        frontsum.append(sum)
    sum=0
    endsum=[]
    for i in range(-1,-(len(nums)+1),-1):
        sum+=nums[i]
        endsum.append(sum)
    endsum.reverse()
    count=0
    for i in range(0,len(frontsum)-1):
        if abs(frontsum[i]-endsum[i+1])%2==0:
            count+=1
    return count
# nums=[10,10,3,7,6]
# print(countPartitions(nums = [10,10,3,7,6]))
# print(nums[:-1])


def GreatcountPartitions(nums: list[int]) -> int:
    l, r = 0, sum(nums)
    ans = 0
    for x in nums[:-1]:
        l += x
        r -= x
        ans += (l - r) % 2 == 0
    return ans
print(GreatcountPartitions(nums=[10,10,3,7,6]))
