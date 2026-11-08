def canJump(nums: list[int]) -> bool:
    max_distance=nums[0]
    index=1
    for num in nums[1:]:
        if max_distance>=index:
            temp=index+num
            max_distance=max(max_distance,temp)
        else:return False
        index+=1
    return True


print(canJump([1,2]))