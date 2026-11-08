#双栈法，
#问题一：预留的*必须在（右边才能进行匹配，进栈信息要保留下标
def checkValidString( s: str) -> bool:
    left_stack = []
    star_stack = []

    for i, ch in enumerate(s):
        if ch == '(':
            left_stack.append(i)
        elif ch == '*':
            star_stack.append(i)
        else:  # ')'
            if left_stack:
                left_stack.pop()
            elif star_stack:
                star_stack.pop()
            else:
                return False

    while left_stack and star_stack:
        left_index = left_stack.pop()
        star_index = star_stack.pop()

        # 星号必须在左括号右边，才能当作右括号
        if star_index < left_index:
            return False
    return not left_stack

#贪心区间写法
def checkValidString2( s: str) -> bool:
    max_val=min_val=0
    for ch in s:
        if ch == '(':
            max_val+=1
            min_val+=1
        elif ch==')':
            min_val-=1
            max_val-=1
            if max_val<0:
                return False
        else:
            min_val-=1
            max_val+=1
        min_val=max(min_val,0)
    return min_val==0
print(checkValidString2("(*)"))