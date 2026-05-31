# 在当前目录初始化一个新仓库
`git init`
# 克隆远程仓库到本地
```
git clone https://github.com/user/repo.git
git clone git@github.com:user/repo.git   
```

# 基本常用操作
## 查看状态
git status
git status -s   # 简洁模式

## 添加文件到暂存区
git add file.txt          # 单个文件
git add .                 # 添加所有修改和新文件
git add -A                # 添加所有（包括删除）

## 提交暂存区内容到本地仓库
git commit -m "提交说明"

## 跳过暂存区直接提交（仅对已跟踪文件）
git commit -a -m "直接提交修改"

## 查看提交历史
git log
git log --oneline --graph --all   # 图形化显示所有分支

## 查看修改差异
git diff                  # 工作区 vs 暂存区
git diff --staged         # 暂存区 vs 最新提交
git diff HEAD~1 HEAD      # 两次提交之间的差异

# 分支操作
## 列出分支
git branch                # 本地分支
git branch -r             # 远程分支
git branch -a             # 所有分支

## 创建分支
git branch feature-xxx

## 切换分支
git checkout feature-xxx
git switch feature-xxx    # Git 2.23+ 推荐

## 创建并切换分支
git checkout -b feature-xxx
git switch -c feature-xxx

## 合并分支（将指定分支合并到当前分支）
git merge feature-xxx

## 变基操作（将当前分支的提交应用到目标分支顶部）
git rebase main

## 删除分支
git branch -d feature-xxx   # 已合并分支
git branch -D feature-xxx   # 强制删除未合并分支

## 推送本地分支到远程
git push origin feature-xxx

# 远程操作
## 查看远程仓库
git remote -v

## 添加远程仓库
git remote add origin https://github.com/user/repo.git

## 从远程拉取更新（不合并）
git fetch origin

## 拉取并合并到当前分支（等价于 fetch + merge）
git pull origin main

## 推送本地提交到远程
git push origin main

## 设置上游分支（跟踪远程分支）
git push -u origin feature-xxx

## 删除远程分支
git push origin --delete feature-xxx