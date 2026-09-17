def countValidSelections(nums: list[int]) -> int:
    numsum=sum(nums)
    pre = 0
    resolut=0
    for i in nums:
        if i==0:
           if pre == numsum - i - pre:
               resolut += 2
           if pre + 1 == numsum - i - pre:
               resolut += 1
           if pre == numsum - i - pre +1:
               resolut += 1
        pre += i
    return resolut
print(countValidSelections([16,13,10,0,0,0,10,6,7,8,7]))

