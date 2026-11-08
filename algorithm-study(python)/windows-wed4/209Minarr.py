def minSubArrayLen(target: int, nums: list[int]) -> int:
    arr_len=float('inf')
    ans=0
    left=0
    for i in range(len(nums)):
        ans+=nums[i]
        if ans >= target:
            arr_len = min(arr_len, i - left + 1)
        #ans结果大于等于tager需要一直收缩
        while left<len(nums) and ans>=target:
            arr_len = min(arr_len, i - left + 1)
            ans-=nums[left]
            left+=1
    if arr_len == float('inf'):
        return 0
    else:return arr_len
print(minSubArrayLen(target = 7, nums = [2,3,1,2,4,3]))

def minSubArrayLen1(target, nums):
    n = len(nums)
    min_len = float('inf')
    window_sum = 0
    left = 0

    for right in range(n):
        window_sum += nums[right]
        while window_sum >= target:                  # 满足条件就一直收缩
            min_len = min(min_len, right - left + 1)
            window_sum -= nums[left]
            left += 1

    return 0 if min_len == float('inf') else min_len
print(minSubArrayLen1(target = 7, nums = [2,3,1,2,4,3]))