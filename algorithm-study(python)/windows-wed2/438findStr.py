def findAnagrams(s: str, p: str) -> list[int]:
    origin_dist={}
    for i in p:
        origin_dist.setdefault(i,0)
        origin_dist[i]+=1
    src_dist={}
    list1=[]
    temp=len(p)
    for i in range(len(s)):
        src_dist.setdefault(s[i],0)
        src_dist[s[i]] += 1
        len_dist=[i for i in src_dist.values()]
        len_dist=sum(len_dist)
        if len_dist<len(p):
            continue
        if origin_dist==src_dist:
           list1.append(i-temp+1)
        src_dist[s[i-temp+1]]-=1
        if src_dist[s[i-temp+1]]==0:
            del src_dist[s[i-temp+1]]
    return list1
print(findAnagrams(s = "cbaebabacd", p = "abc"))

