from collections import deque

def maxSlidingWindow( nums: list[int], k: int) -> list[int]:
    if not nums or k <= 0:
        return []
    if k >= len(nums):
        return [max(nums)]
    dq = deque()
    result = []
    for index,i in enumerate(nums):
        #保证队列严格递减
        while deque and nums[dq[-1]]<=i:
            dq.pop()
        dq.append(index)
        #删除过期数据
        if dq[0]<=index-k:
            dq.popleft()
        if index>=k-1:
            result.append(nums[dq[0]])
    return result

    return result
print(maxSlidingWindow(nums = [3,1,1,-3,5,3,6,7], k = 3))