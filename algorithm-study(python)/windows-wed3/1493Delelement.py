def longestSubarray(nums: list[int]) -> int:
    ans=0
    left=0
    count=0
    if nums.count(0)==0:
        return len(nums)-1
    for index,x in enumerate(nums):
        if x==0:
            count+=1
        while count>1:
            if nums[left]==0:
                count-=1
            left+=1
        ans=max(ans,index-left+1)
    return ans-1
print(longestSubarray(nums = [1,1,0,1]))

