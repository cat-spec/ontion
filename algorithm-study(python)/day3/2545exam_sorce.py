#根据第k场考试的分数排序

def sortTheStudents(score: list[list[int]], k: int) -> list[list[int]]:
    ky_maxlist=[]
    for i in range(0, len(score)):
        ky_maxlist.append(score[i][k])
    ky_maxlist.sort(reverse=True)
    res=[]

    return res

print(sortTheStudents(score = [[10,6,9,1],[7,5,11,2],[4,8,3,15]], k = 2))