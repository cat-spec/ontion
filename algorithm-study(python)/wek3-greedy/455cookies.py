"""
假设你是一位很棒的家长，想要给你的孩子们一些小饼干。但是，每个孩子最多只能给一块饼干。

对每个孩子 i，都有一个胃口值 g[i]，这是能让孩子们满足胃口的饼干的最小尺寸；并且每块饼干 j，都有一个尺寸 s[j] 。
如果 s[j] >= g[i]，我们可以将这个饼干 j 分配给孩子 i ，这个孩子会得到满足。
你的目标是满足尽可能多的孩子，并输出这个最大数值。

"""

def findContentChildren( g: list[int], s: list[int]) -> int:
    g.sort()
    s.sort()
    first=0
    second=0
    result = 0
    while first<len(g) and second<len(s):
        if g[first]>s[second]:
            second+=1
        else:
            first+=1
            second+=1
            result+=1
    return result

print(findContentChildren(g = [1,2,3], s = [1,1]))