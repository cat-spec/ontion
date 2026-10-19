def divideArray(nums: list[int], k: int) -> list[list[int]]:
    nums.sort()
    result=[]
    for i in range(0,len(nums),3):
        sub_list=[]
        for j in range(i,i+3):
            sub_list.append(nums[j])
        result.append(sub_list)
    for x in result:
        for y in range(0,1):
            if x[y+2]-x[y]>k:
                return []
    return result

def divideArray2(nums: list[int], k: int)-> list[list[int]]:
    nums.sort()
    result = []
    for i in range(0, len(nums), 3):
        sub_list = []
        if nums[i+2]-nums[i]>k:
            return []
        sub_list.append(nums[i])
        sub_list.append(nums[i+1])
        sub_list.append(nums[i+2])
        result.append(sub_list)
    return result
print(divideArray2(nums = [1,3,4,8,7,9,3,5,1], k = 2))