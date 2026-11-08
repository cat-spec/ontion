"""
以数组 intervals 表示若干个区间的集合，
其中单个区间为 intervals[i] = [starti, endi] 。
请你合并所有重叠的区间，并返回 一个不重叠的区间数组，该数组需恰好覆盖输入中的所有区间 。
"""

def merge(intervals: list[list[int]]) -> list[list[int]]:
    intervals.sort(key=lambda x: x[0])
    pre_right=-1
    result=[]
    point = -1
    for index,i in enumerate(intervals):
        #不交叉 所有不用合并
        if i[0]>pre_right:
            pre_right=i[1]
            result.append(i)
            point+=1
        else:
            #需要合并，但是还要判断
            pre_right=max(pre_right,i[1])
            result[point][1]=pre_right
    return result
print(merge(intervals = [[1,4],[0,2],[3,5]]))

