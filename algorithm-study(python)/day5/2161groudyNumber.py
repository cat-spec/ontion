"""
给你一个下标从 0 开始的整数数组 nums 和一个整数 pivot 。请你将 nums 重新排列，使得以下条件均成立：

所有小于 pivot 的元素都出现在所有大于 pivot 的元素 之前 。
所有等于 pivot 的元素都出现在小于和大于 pivot 的元素 中间 。
小于 pivot 的元素之间和大于 pivot 的元素之间的 相对顺序 不发生改变。
更正式的，考虑每一对 pi，pj ，pi 是初始时位置 i 元素的新位置，pj 是初始时位置 j 元素的新位置。如果 i < j 且两个元素 都 小于（或大于）pivot，那么 pi < pj 。
请你返回重新排列 nums 数组后的结果数组。

"""
def pivotArray(nums: list[int], pivot: int) -> list[int]:
    # index=nums.index(pivot)
    nums.remove(pivot)
    nums.append(pivot)
    front=0
    end=len(nums)-1
    nums[end]='1'
    # 快速排序元素跟换位置的逻辑 有卡点
    while front < end:
        if nums[end]==pivot or nums[front]==pivot:
            if nums[front]=='1':
                end-=1
            else:
                front+=1
            continue
        if nums[front]!='1' and nums[front] > pivot and nums[end]=='1':
            nums[end]=nums[front]
            nums[front]='1'
            end-=1
            continue
        if nums[front]!='1' and nums[front]<pivot:
            front+=1
            continue
        if nums[end]!='1' and nums[front]=='1' and nums[end]<pivot:
            nums[front]=nums[end]
            nums[end]='1'
            front+=1
            continue
        if nums[end]!='1' and nums[end]>pivot:
            end-=1
            continue
    nums[front]=pivot
    return nums
print(pivotArray(nums = [9,12,5,10,14,3,10], pivot = 10))