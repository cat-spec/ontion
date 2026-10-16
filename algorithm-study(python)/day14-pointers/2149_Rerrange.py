"""
给你一个下标从 0 开始的整数数组 nums ，数组长度为 偶数 ，由数目 相等 的正整数和负整数组成。
你需要返回满足下述条件的数组 nums：
任意 连续 的两个整数 符号相反
对于符号相同的所有整数，保留 它们在 nums 中的 顺序 。
重排后数组以正整数开头。
重排元素满足上述条件后，返回修改后的数组。
"""
def rearrangeArray(nums: list[int]) -> list[int]:
    list1=[0]*len(nums)
    zhen=0
    nevigate=1
    for num in nums:
        if num>0:
            list1[zhen]=num
            zhen+=2
        else:
            list1[nevigate]=num
            nevigate+=2
    return list1

print(rearrangeArray([3,1,-2,-5,2,-4]))
