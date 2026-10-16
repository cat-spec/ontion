def appendCharacters(s: str, t: str) -> int:
    second=0
    for i in s:
        if second<len(t):
            if i == t[second]:
                second += 1
    return len(t)-second

print(appendCharacters("coaching",'coding'))