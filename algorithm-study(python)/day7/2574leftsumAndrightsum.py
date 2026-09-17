def leftRightDifference( nums: list[int]) -> list[int]:
    leftsum = [0] * len(nums)
    rightsum = [0] * len(nums)
    for i in range(1, len(nums)):
        leftsum[i] = leftsum[i - 1] + nums[i - 1]
    for j in range(-2, -(len(nums) + 1), -1):
        rightsum[j] = rightsum[j + 1] + nums[j + 1]
    answer = []
    for k in range(len(nums)):
        answer.append(abs(leftsum[k] - rightsum[k]))
    return answer
print(leftRightDifference([10,4,8,3]))