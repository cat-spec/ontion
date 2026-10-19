def divideArray(nums: list[int], k: int) -> list[list[int]]:
    i = len(nums)//3
    for j in range(0, i):
        count = 0
        sub_list = []
        sum_val = 0
        v=0
        len1=len(nums)-1
        list1 = []
        while v<len1:
            if count == 3:
                break
            if sum_val + nums[v] <= k:
                list1.append(nums[v])
                sum_val += nums[v]
                count += 1
                len1-=1
                nums.remove(nums[v])
            v+=1
        sub_list.extend(list1)
    return sub_list
print(divideArray(nums = [1,3,4,8,7,9,3,5,1], k = 2))