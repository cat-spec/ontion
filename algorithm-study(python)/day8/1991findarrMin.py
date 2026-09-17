def findMiddleIndex(nums: list[int]) -> int:
    numSum=sum(nums)
    presum=0
    for i in range(0, len(nums)):
        if presum==numSum-nums[i]-presum:
            return i
        presum+=nums[i]
    return -1


print(findMiddleIndex(nums = [1,7,3,6,5,6]))