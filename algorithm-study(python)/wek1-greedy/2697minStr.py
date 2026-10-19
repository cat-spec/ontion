def makeSmallestPalindrome(s: str) -> str:
    left, right = 0, len(s) - 1
    result=[0]*len(s)
    while left <= right:
        if s[left] == s[right]:
            result[left] = s[left]
            result[right] = s[right]
        else:
            res=right if s[left]>s[right] else left
            result[left] = s[res]
            result[right] = s[res]
        left += 1
        right -= 1

    return ''.join(result)
print(makeSmallestPalindrome('egcfe'))
