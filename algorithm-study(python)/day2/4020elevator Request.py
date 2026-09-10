class Solution:
    def elevatorRequests(self, n: int, requests: list[int]) -> int:
        sum = requests[0]
        for i in range(0,len(requests)-1):
            if requests[i] > requests[i + 1]:
                temp = requests[i] - requests[i + 1]
            else: temp=requests[i+1]-requests[i]
            sum += temp
        return sum
s=Solution()
print(s.elevatorRequests(5,[2,1,4,3]))