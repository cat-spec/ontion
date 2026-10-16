"""
珂珂喜欢吃香蕉。这里有 n 堆香蕉，第 i 堆中有 piles[i] 根香蕉。警卫已经离开了，将在 h 小时后回来。

珂珂可以决定她吃香蕉的速度 k （单位：根/小时）。每个小时，她将会选择一堆香蕉，从中吃掉 k 根。如果这堆香蕉少于 k 根，她将吃掉这堆的所有香蕉，然后这一小时内不会再吃更多的香蕉。

珂珂喜欢慢慢吃，但仍然想在警卫回来前吃掉所有的香蕉。

返回她可以在 h 小时内吃掉所有香蕉的最小速度 k（k 为整数）。

"""
#二分答案 答案在一个单调区间 最小值 --最大值 必定在这之中
def minEatingSpeed(piles: list[int], h: int) -> int:
    piles.sort()
    def check(num):
        count=0
        for i in piles:
            #向上取整数
            count+=(i+num-1)//num
        return count
    left=1
    right=piles[-1]
    result=right
    while left<=right:
        mid=(left+right+1)//2
        temp=check(mid)
        if temp<=h:
            result=min(result,mid)
            right=mid-1
        elif temp>h:
            left=mid+1
    return result
if __name__=="__main__":
    print(minEatingSpeed(piles=[312884470], h=312884469))