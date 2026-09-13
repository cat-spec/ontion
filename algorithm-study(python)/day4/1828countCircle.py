"""
给你一个数组 points ，其中 points[i] = [xi, yi] ，表示第 i 个点在二维平面上的坐标。多个点可能会有 相同 的坐标。

同时给你一个数组 queries ，其中 queries[j] = [xj, yj, rj] ，表示一个圆心在 (xj, yj) 且半径为 rj 的圆。

对于每一个查询 queries[j] ，计算在第 j 个圆 内 点的数目。如果一个点在圆的 边界上 ，我们同样认为它在圆 内 。

请你返回一个数组 answer ，其中 answer[j]是第 j 个查询的答案。
"""

def countPoints(points: list[list[int]], queries: list[list[int]]) -> list[int]:
    res=[]
    for queries in queries:
        count = 0
        for i in points:
            x=abs(queries[0]-i[0])
            y=abs(queries[1]-i[1])
            if x==0 or y==0 and max(x,y)<=queries[2]:
                count+=1
            elif x!=0 and y!=0:
                if (x**2+y**2)**0.5<queries[2]:
                    count+=1
        res.append(count)
    return res

print(countPoints(points = [[1,3],[3,3],[5,3],[2,2]], queries = [[2,3,1],[4,3,1],[1,1,2]]))