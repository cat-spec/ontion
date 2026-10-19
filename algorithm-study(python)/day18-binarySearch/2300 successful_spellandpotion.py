

def successfulPairs(spells: list[int], potions: list[int], success: int) -> list[int]:
    potions.sort()
    m=len(potions)
    result=[]
    for spell in spells:
        count=0
        bool1=True
        for potion in potions:
            res = spell * potion
            if res >= success:
                bool1=False
                result.append(m-count)
                break
            count+=1
        if bool1:result.append(0)
    return result

def successfulPairs1(spells: list[int], potions: list[int], success: int) -> list[int]:
    potions.sort()
    m=len(potions)
    result=[]
    for spell in spells:
        left=0
        right=m
        target=(success+spell-1)//spell
        while left<right:
            mid_val=(left+right)//2
            if potions[mid_val]>=target:
                right=mid_val
            else:
                left=mid_val+1
        result.append(m-left)
    return result


print(successfulPairs1(spells = [3,1,2], potions = [8,5,8], success = 16))