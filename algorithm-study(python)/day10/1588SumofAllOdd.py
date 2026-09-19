def sumOddLengthSubarrays(arr: list[int]) -> int:
    length = len(arr)
    sumres=sum(arr)

    for i in range(0,length):
        for j in range(i+3,length+1,2):
            sumres+=sum(arr[i:j])
    return sumres


print(sumOddLengthSubarrays(arr = [1,4,2,5,3]))