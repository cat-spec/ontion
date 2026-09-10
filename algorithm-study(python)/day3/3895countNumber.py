# 统计字符出现总次数
def countDigitOccurrences(nums: list[int], digit: int) -> int:
    digit=str(digit)
    print(str(i).count(digit) for i in nums)
    return sum(str(i).count(digit) for i in nums)

print(countDigitOccurrences( nums = [12,54,32,22], digit = 2))