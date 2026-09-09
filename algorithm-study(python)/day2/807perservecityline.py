class Solution:
    def maxIncreaseKeepingSkyline(self, grid: list[list[int]]) -> int:
        sum=0
        for i in range(len(grid)):
            y_max=0
            for j in range(len(grid[i])):
                y_max=max(grid[j][i],y_max)
                x_max = max(grid[i][:])
                my_min = min(x_max, y_max)
                if my_min < grid[i][j]:
                    sum += grid[i][j]
                else:
                    sum += my_min - grid[i][j]
        return sum
s=Solution()
grid = [[3,0,8,4],[2,4,5,7],[9,2,6,3],[0,3,1,0]]
# print(s.maxIncreaseKeepingSkyline(grid))
# print(grid[1])
items = [('a', 1), ('b', 2), ('c', 3)]
# 推导式
d = {value: key for key, value in items}
print(d)