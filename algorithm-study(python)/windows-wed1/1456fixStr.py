def maxVowels(s: str, k: int) -> int:
    #初始化第一字符串
    result=0
    for i in range(k):
        if s[i] in 'aeiou':
            result += 1
    temp=result
    #开启移动窗口
    for index,x in enumerate(s[k:]):
        left=0
        right=0
       #判断窗口头部
        if s[index] in 'aeiou':
            left += 1
        if x in 'aeiou':
            right += 1
        temp=temp-left+right
        result = max(result, temp)
    return result
print(maxVowels(s = "abciiidef", k = 3))
