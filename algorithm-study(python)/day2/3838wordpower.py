class Solution:
    def mapWordWeights(self, words: list[str], weights: list[int]) -> str:
        char=''
        for i in words:
            sum=0
            for j in i:
                sum+=weights[ord(j)-ord('a')]
            sum%=26
            char+=chr(ord('z')-sum)
        return char
words = ["abcd","def","xyz"]
weights = [5,3,12,14,1,2,3,2,10,6,6,9,7,8,7,10,8,9,6,9,9,8,3,7,7,2]
print(ord(words[0][0]))
s= Solution()
print(s.mapWordWeights(words,weights))