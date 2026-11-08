def longestOnes(nums: list[int], k: int) -> int:
    ans=0
    left=0
    count=0
    for index,x in enumerate(nums):
        if x==0:
           count+=1
        while count>k:
            if nums[left]==0:
                count-=1
            left+=1
        ans=max(ans,index-left+1)
    return ans
print(longestOnes([1,1,1,0,0,0,1,1,1,1,0],2))