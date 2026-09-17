def garbageCollection(garbage: list[str], travel: list[int]) -> int:
    re_garbage=0
    # 垃圾回收总时间
    gcar=pcar=mcar=0
    trave=[0]*len(garbage)
    for index,item in enumerate(garbage):
        re_garbage+=len(item)
        if index==0:continue
        trave[index] = trave[index-1] + travel[index-1]
        if item.count("G")>=1 :
            gcar=index
        if item.count('P')>=1:
            pcar=index
        if item.count("M")>=1:
            mcar=index
    return re_garbage+trave[gcar]+trave[pcar]+trave[mcar]

print(garbageCollection(garbage = ["G","P","GP","GG"], travel = [2,4,3]))
