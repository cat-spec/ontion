#定长窗口
def findMaxAverage(nums: list[int], k: int) -> float:
    left = 0
    right=k-1
    result = sum(nums[left:right+1])
    temp=result
    for i in range(len(nums)-k):
        temp=temp-nums[left]+nums[right+1]
        result=max(result,temp)
        left+=1
        right+=1
    return result/k

def findMaxAverage1(nums: list[int], k: int) -> float:
        max_s = float('-inf')  # 窗口元素和的最大值
        s = 0  # 维护窗口元素和
        for i, x in enumerate(nums):
            # 1. 进入窗口
            s += x
            if i < k - 1:  # 窗口大小不足 k
                continue
            # 2. 更新答案
            max_s = max(max_s, s)
            # 3. 离开窗口
            s -= nums[i - k + 1]
        return max_s / k

print(findMaxAverage1(nums = [1,12,-5,-6,50,3], k = 4))
