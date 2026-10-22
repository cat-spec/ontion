
def minOperations(nums: list[int]) -> int:
    first=0
    result=0
    for i in range(1,len(nums)):
        if nums[first]>=nums[i]:
            temp=nums[first]-nums[i]+1
            result +=temp
            nums[i]+=temp
        first+=1
    return result
print(minOperations(nums=[1,5,2,4,1]))

