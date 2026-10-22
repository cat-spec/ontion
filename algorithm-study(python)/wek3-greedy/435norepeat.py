def eraseOverlapIntervals(intervals: list[list[int]]) -> int:
    intervals.sort(key=lambda x: x[1])
    pre_right=float('-inf')
    count=0
    for l,r in intervals:
        if l>=pre_right:
            pre_right=r
        else:
            count+=1
    return count
print(eraseOverlapIntervals([[1,2],[2,3],[3,4],[1,3]]))
