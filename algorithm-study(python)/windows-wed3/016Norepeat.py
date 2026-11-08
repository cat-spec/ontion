def lengthOfLongestSubstring(s: str) -> int:
    dist={}
    result=0
    redist={}
    start=0
    for i,x in enumerate(s):
        dist[x]= dist.get(x,0)+1
        #无重复就纪录一次字典长度等于值的长度，也就是值全1
        if len(dist)==sum(dist.values()):
            redist.setdefault(x,0)
            redist[x]=i
            result=max(result,len(dist))
        #遇到重复情况了
        else:
            index=redist[x]
            redist[x]=i
            for i in range(start,index+1):
                dist[s[i]]-=1
                if dist[s[i]]==0:
                    del dist[s[i]]
            start=index+1
    return result

def lengthOfLongestSubstring1(s: str) -> int:
    #只记录下标
    dist={}
    ans=0
    left=0
    for i,x in enumerate(s):
        #遇见重复了
        if x in dist and dist[x]>=left:
            left=dist[x]+1
        dist[x]=i
        ans=max(ans,i-left+1)
    return ans


print(lengthOfLongestSubstring1(s = "abcabcbb"))