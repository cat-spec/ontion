def maxDistance(position: list[int], m: int) -> int:
    position.sort()

    def can_place(mid):
        count = 1
        last = position[0]
        for x in position[1:]:
            if x - last >= mid:
                count += 1
                last = x
                if count >= m:
                    return True
        return False

    left = 1
    right = position[-1] - position[0]
    ans = 1

    while left <= right:
        mid = (left + right) // 2
        if can_place(mid):
            ans = mid
            left = mid + 1
        else:
            right = mid - 1

    return ans


print(maxDistance([1,2,3,4,7], 3))  # 3