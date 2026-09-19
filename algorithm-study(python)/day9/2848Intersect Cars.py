def numberOfPoints(nums: list[list[int]]) -> int:
    list=[0]*100
    for num in nums:
        for i in range(num[0], num[1]+1):
            list[i]=1
    return sum(list)
def greadnumberOfPoints(nums: list[list[int]]) -> int:
    C = max(y for _, y in nums)
    diff = [0] * (C + 2)
    for x, y in nums:
        diff[x] += 1
        diff[y + 1] -= 1

    ans = count = 0
    for i in range(1, C + 1):
        count += diff[i]
        if count > 0:
            ans += 1
    return ans
print(greadnumberOfPoints(nums = [[3,6],[1,5],[4,7]]))
