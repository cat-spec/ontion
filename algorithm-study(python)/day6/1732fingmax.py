def largestAltitude( gain: list[int]) -> int:
    # answer 先保存每个位置左侧所有元素的乘积（前缀积）
    n=len(gain)
    answer = [1] * n
    # 第一遍：计算前缀积
    for i in range(1, n):
        answer[i] = answer[i - 1] * gain[i - 1]
    # right 表示当前位置右侧所有元素的乘积（后缀积）
    right = 1
    # 第二遍：从右向左遍历
    for i in range(n - 1, -1, -1):
        # 前缀积 × 后缀积 = 最终答案
        answer[i] *= right
        # 更新后缀积，供下一轮使用
        right *= gain[i]
    return answer

print(largestAltitude([1,2,3,4]))