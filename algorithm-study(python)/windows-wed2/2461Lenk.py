def maximumSubarraySum(nums: list[int], k: int) -> int:
    dist = {}
    window_sum = 0
    result = 0  # 若 nums 可能为负，改成 float('-inf')

    for i, x in enumerate(nums):
        # 加入右端
        dist[x] = dist.get(x, 0) + 1
        window_sum += x

        # 移出左端
        if i >= k:
            left = nums[i - k]
            dist[left] -= 1
            if dist[left] == 0:
                del dist[left]
            window_sum -= left

        # 窗口已满 且 无重复
        if i >= k - 1 and len(dist) == k:
            result = max(result, window_sum)

    return result
print(maximumSubarraySum(nums = [1,1,1,2,9,9,9], k = 3))
