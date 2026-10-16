"""
给你一个下标从 0 开始长度为 n 的整数数组 nums 和一个整数 target ，请你返回满足 0 <= i < j < n
且 nums[i] + nums[j] < target 的下标对 (i, j) 的数目。

"""

def countPairs(nums: list[int], target: int) -> int:
    nums.sort()
    length=len(nums)
    count=0
    for i in range(length):
        for j in range(i+1,length):
            if nums[i]+nums[j]<target:
                count+=1
            else:continue;
    return count

print(countPairs(nums=[-1,1,2,3,1],target=2))
