def equalSubstring(s: str, t: str, maxCost: int) -> int:
    ans=0
    left=0
    res_sum=0

    for index,x in enumerate(s):
        res_sum += abs(ord(s[index]) - ord(t[index]))
        while res_sum>maxCost:
            res_sum -= abs(ord(s[left]) - ord(t[left]))
            left+=1
        ans=max(ans,index-left+1)
    return ans

print(equalSubstring(s = "abcd", t = "cdef", maxCost = 1))
