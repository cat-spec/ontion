def lemonadeChange(bills: list[int]) -> bool:
    dist={5:0,10:0,20:0}
    for bill in bills:
        if bill==5:
            dist[5]+=1
        if bill==10:
            if dist[5]>=1:
                dist[5]-=1
                dist[10]+=1
            else:return False
        if bill==20:
            if dist[10]>=1 and dist[5]>=1:
                dist[10]-=1
                dist[5]-=1
                dist[20]+=1
            elif dist[5]>=3:
                dist[5]-=3
                dist[20]+=1
            else:return False
    return True
print(lemonadeChange(bills = [5,5,10,10,20]))