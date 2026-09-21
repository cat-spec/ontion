def rearrangeString(s: str, x: str, y: str) -> str:
    num = s.count(y)
    numx = s.count(x)
    if num != 0 and numx != 0:
        list = [str1 for str1 in s]
        list.sort()
        indexx = list.index(x)
        indexy = list.index(y)
        for j in range(num):
            if indexy > indexx:
                list[indexy] = x
                list[indexx] = y
                indexy = s.index(y, indexy)
                indexx -= 1
        return "".join(list)
    return s

if __name__=="__main__":
    print(rearrangeString("aabc","a","c"))
