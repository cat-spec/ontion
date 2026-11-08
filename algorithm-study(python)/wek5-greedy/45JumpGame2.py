def jump(nums: list[int]) -> int:
    n = len(nums)
    if n == 1:
        return 0
    count = 0
    index = 0
    while index < n - 1:
        distance = index + nums[index]
        count += 1
        if distance >= n - 1:
            return count
        # 在 [index+1, distance] 内找 i + nums[i] 最大的落点
        best_index = index + 1
        best_reach = best_index + nums[best_index]
        for i in range(index + 1, distance + 1):
            if i + nums[i] > best_reach:
                best_reach = i + nums[i]
                best_index = i
        index = best_index
    return count

def jump1(nums: list[int]) -> int:
    ans = 0
    cur_end = 0  # 已建造的桥的右端点
    next_end = 0  # 下一座桥的右端点的最大值
    for i in range(len(nums) - 1):
        # 遍历的过程中，记录下一座桥的最远点
        next_end = max(next_end, i + nums[i])
        if i == cur_end:  # 无路可走，必须建桥
            cur_end = next_end  # 建桥后，最远可以到达 next_end
            ans += 1
    return ans

print(jump1(nums = [2,3,1,1,4]))