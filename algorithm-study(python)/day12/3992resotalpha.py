def rearrangeString(s: str, x: str, y: str) -> str:
    list1=[str1 for str1 in s]
    numx=list1.count(x)
    numy=list1.count(y)
    if numx!=0 and numy!=0:
        for i in range(numy):
            list1.remove(y)
            list1.append(y)
        list1.reverse()
        return "".join(list1)
    return s

if __name__=="__main__":
    print(rearrangeString("nkgbfmmec","f","m"))
