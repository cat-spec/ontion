def maxSatisfied(customers: list[int], grumpy: list[int], minutes: int) -> int:
    #第一步求冷静时间用在什么地方
    n = len(customers)
    result = 0
    for i in range(minutes):
        if grumpy[i]==1:
            result += customers[i]
    temp=result
    idx=0
    for index,i in enumerate(customers[minutes:]):
        if grumpy[index+minutes]==1:
            temp+=i
        if grumpy[index]==1:
            temp-=customers[index]
        if temp > result:
            result = temp
            idx = index+1
    for i in range(idx, min(idx + minutes, n)):
        grumpy[i] = 0
    result=0
    for index,i in enumerate(customers):
        if grumpy[index]==0:
            result+=i
    return result

def maxSatisfied1(customers: list[int], grumpy: list[int], minutes: int) -> int:
    result=0 #不使用冷静时间
    for i in range(len(customers)):
        if grumpy[i]==0:
            result += customers[i]
    arger=0 #该窗口内生气的人数
    for i in range(minutes):
        if grumpy[i]==1:
            arger += customers[i]
    temp=arger
    for j in range(len(customers[minutes:])):
        if grumpy[j]==1:
            temp-=customers[j]
        if grumpy[j+minutes]==1:
            temp+=customers[j]
        arger=max(arger,temp)
    return result+arger


print(maxSatisfied1(customers = [1,0,1,2,1,1,7,5], grumpy = [0,1,0,1,0,1,0,1], minutes = 3))


