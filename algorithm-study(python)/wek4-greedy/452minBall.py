def findMinArrowShots(points: list[list[int]]) -> int:
    points.sort(key=lambda x: x[1])
    count=0
    pre_right=float('-inf')
    result=0
    for index,i in enumerate(points):
        #不相干 射一箭
        if i[0]>pre_right:
              result+=1
              pre_right=i[1]
        #有相交范围 ，继续判断
    return result
print(findMinArrowShots(points = [[10,16],[2,8],[1,6],[7,12]]))