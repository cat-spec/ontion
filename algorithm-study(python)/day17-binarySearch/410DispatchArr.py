"""
给定一个非负整数数组 nums 和一个整数 k ，你需要将这个数组分成 k 个非空的连续子数组，使得这 k 个子数组各自和的最大值 最小。

返回分割后最小的和的最大值。

子数组 是数组中连续的部分。
"""

def splitArray(ums: list[int], k: int) -> int:
    left=ums[0]
    right=sum(ums)
    def check(mid):
        sum_val=0
        count=0
        max_val=min(ums)
        for i in ums:
            if sum_val+i<=mid:
                sum_val+=i
            else:
                max_val=max(max_val,sum_val)
                count+=1
                sum_val=i
        return count+1,max(sum_val,max_val)
    result=right
    while left<=right:
        mid=(left+right+1)//2
        count,max_val=check(mid)
        if count<=k:
            result=min(result,max_val)
            right=mid-1
        elif count>k:
            left=mid+1
    return result

print(splitArray([5,5,5,5],  3))