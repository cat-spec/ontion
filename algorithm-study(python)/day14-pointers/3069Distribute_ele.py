"""
给你一个下标从 1 开始、包含 不同 整数的数组 nums ，数组长度为 n 。

你需要通过 n 次操作，将 nums 中的所有元素分配到两个数组 arr1 和 arr2 中。在第一次操作中，将 nums[1] 追加到 arr1 。在第二次操作中，将 nums[2] 追加到 arr2 。之后，在第 i 次操作中：

如果 arr1 的最后一个元素 大于 arr2 的最后一个元素，就将 nums[i] 追加到 arr1 。否则，将 nums[i] 追加到 arr2 。
通过连接数组 arr1 和 arr2 形成数组 result 。连接两个数组是将第二个数组追加到第一个数组的末尾；例如，将 [1,2,3] 与 [4,5,6] 连接得到 [1,2,3,4,5,6]。

返回数组 result 。
"""

def resultArray(nums: list[int]) -> list[int]:
    list1=[nums[0]]
    list2=[nums[1]]
    for i in nums[2:]:
        if list1[-1]>list2[-1]:
            list1.append(i)
        else:
            list2.append(i)
    list1.extend(list2)
    return list1
if __name__ == '__main__':
    print(resultArray([2,1,3]))
