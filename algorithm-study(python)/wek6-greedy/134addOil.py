def canCompleteCircuit(gas: list[int], cost: list[int]) -> int:
    total = 0
    cur = 0
    start = 0

    for i in range(len(gas)):
        diff = gas[i] - cost[i]
        total += diff
        cur += diff

        if cur < 0:
            start = i + 1
            cur = 0

    return start if total >= 0 else -1
print(canCompleteCircuit(gas =[1,2,3,4,5], cost = [3,4,5,1,2]))
