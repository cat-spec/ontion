def productExceptSelf(nums: list[int]) -> list[int]:
    answer = [1] * len(nums)
    for i in range(1, len(nums)):
        answer[i] = answer[i - 1] * nums[i - 1]
    right = 1
    for j in range(-1, -(len(nums)+1), -1):
        answer[j] = answer[j] * right
        right *= nums[j]
    return answer
print(productExceptSelf(nums=[1, 2, 3, 4]))