def pivotInteger( n: int) -> int:
    sum = 0
    presum=[0]
    for i in range (1,n+1):
        sum += i
        presum.append(sum)
    for i in range(1,n+1):
        if(presum[i]==(sum-presum[i]+i)):
            return i
    return -1

def grantpivotInteger(n: int) -> int:
    left, right = 0, 0
    for i in range(1, n + 1):
        left += i
    for j in range(n, -1, -1):
        right += j
        if right == left:
            return j
        left -= j
        if right > left:
            return -1
import time
start=time.perf_counter()
print(pivotInteger(10000000))
# print(grantpivotInteger(10000000))
end=time.perf_counter()
print(end-start)