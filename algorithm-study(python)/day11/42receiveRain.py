def trap(height: list[int]) -> int:
    result=i=0
    while i<len(height)-1:
        resum=0
        # 情况一：能找到右侧最高值
        # 如果当前值高于后一个值才能开始迭代
        if height[i]>height[i+1]:
            for j in range(i+1, len(height)):
                if height[i]<=height[j]:
                    i=j-1
                    result+=resum
                    break
                resum+=abs(height[i]-height[j])
        i+=1
    #     情况二：右侧找不到最高值，找右侧比较高值
    return result
def trap_fast(height) -> int:
    left,right,leftsum,rightsum=0,len(height)-1,0,0
    res=0
    while left<right:
        if height[left]<height[right]:
            if height[left]>leftsum:
                leftsum=height[left]
            else:res+=leftsum-height[left]
            left+=1
        else:
            if height[right]>rightsum:
                rightsum=height[right]
            else:res+=rightsum-height[right]
            right-=1
    return res
# print(trap(height = [0,1,0,2,1,0,1,3,2,1,2,1]))
print(trap_fast([0,1,0,2,1,0,1,3,2,1,2,1]))