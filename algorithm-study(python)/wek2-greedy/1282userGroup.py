def groupThePeople(groupSizes: list[int]) -> list[list[int]]:
    dist={}
    result=[]
    dist = {}  # 键: size, 值: 下标列表
    for index, size in enumerate(groupSizes):
        if size not in dist.keys():
            dist.setdefault(size, []).append(index)
        elif size==len(dist[size]):
            result.append(dist[size])
            dist[size]=[]
            dist[size].append(index)
        else:
            dist[size].append(index)
          # 关键：先确保键存在
    for size in sorted(dist.keys()):
        result.append(dist[size])
    return result
print(groupThePeople(groupSizes = [3,3,3,3,3,1,3]))
