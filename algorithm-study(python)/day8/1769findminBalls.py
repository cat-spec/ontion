def minOperations(boxes: str) -> list[int]:
    list=[]
    ressum = []
    for box in boxes:
        list.append(int(box))
    for i in range(0,len(list)):
        left=i-1
        leftsum=rightsum=0
        step=1
        right=i+1
        while left>=0:
            leftsum+=list[left]*step
            left-=1
            step+=1
        step=1
        while right<=len(list)-1:
            rightsum+=list[right]*step
            right+=1
            step+=1
        ressum.append(leftsum+rightsum)
    return ressum
# print(minOperations(boxes = "001011"))

def greatminOperations(boxes: str) -> list[int]:
    res = []
    for i in range(len(boxes)):
        s = sum(abs(j - i) for j, c in enumerate(boxes) if c == '1')
        res.append(s)
    return res

print(greatminOperations(boxes = "001011"))