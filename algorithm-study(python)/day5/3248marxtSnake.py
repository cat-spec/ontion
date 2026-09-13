"""
大小为 n x n 的矩阵 grid 中有一条蛇。蛇可以朝 四个可能的方向 移动。矩阵中的每个单元格都使用位置进行标识： grid[i][j] = (i * n) + j。

蛇从单元格 0 开始，并遵循一系列命令移动。

给你一个整数 n 表示 grid 的大小，另给你一个字符串数组 commands，其中包括 "UP"、"RIGHT"、"DOWN" 和 "LEFT"。题目测评数据保证蛇在整个移动过程中将始终位于 grid 边界内。

返回执行 commands 后蛇所停留的最终单元格的位置。
"""

def finalPositionOfSnake( n: int, commands: list[str]) -> int:
    matrix = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            matrix[i][j] = i * n + j
    origin=[0,0]
    for command in commands:
        if command == "UP":
            origin[0] -= 1
        elif command == "RIGHT":
            origin[1] += 1
        elif command == "DOWN":
            origin[0] += 1
        else:
            origin[1] -= 1
    return matrix[origin[0]][origin[1]]
print(finalPositionOfSnake(2,commands = ["RIGHT","DOWN"]))