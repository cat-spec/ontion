https://blog.csdn.net/weixin_43691773/article/details/109305359 狂神笔记
# 容器化
1.只打包需要的包，所占空间少，启动迅速
2.每一个容器相互隔离，都有属于自己的数据，文件系统

# 镜像常用命令
```shell
docker images //查看所有镜像
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
hello-world         latest              bf756fb1ae65        8 months ago        13.3kB
# 解释
REPOSITORY  镜像的仓库源
TAG         镜像的标签
IMAGE ID    镜像的id
CREATED     镜像的创建时间

# 可选项
	-a, --all      # 列出所有的镜像
	-q, --quiet    # 只显示镜像的id
	
=========================
#搜寻对应镜像信息
docker search <image-name>
==========================
#进行镜像下载
docker pull <image-nmae:version>
==========================
docker rmi -f 容器id                # 删除指定的容器
docker rmi -f  容器id 容器id 容器id  # 删除多个容器
docker rmi -f $(docker images -aq) # 删除全部容器
参数
-f 强制删除
============================
```

# 容器命令
```shell
================
# 新建容器
docker run [可选参数] image
# 参数说明
--name = "Name"    容器名字  tomcat01，tomcat02,用来区分容器
-d                 后台方式运行
-it                使用交互方式运行，进入容器查看区分
-p                 指定容器的端口 -p 8080：8080
    -p ip:主机端口：容器端口
    -p 主机端口：容器端口(常用)
    -p 容器端口
    容器端口
-p                 随机指定端口
# 从容器中退回主机
[root@94d468db18da /]# exit
=======================
#展示当前运行的容器
docker ps 
-a # 列出当前正在运行的容器+带出历史运行过的容器 
-n=? # 显示最近创建的容器 
-q # 只显示容器的编号

=====================
# 删除容器
docker rm 容器id

# 启动容器
docker start 容器id        # 启动容器
docker restart 容器id      # 重启容器
docker stop 容器id         # 停止当前正在运行的容器
docker kill 容器id         # 强制停止当前容器
```
# 其他查看命令
```shell
==============================
# 查看容器日志信息
docker logs -tf --tail 10 f1178d5b0bd8
==============================
# 查看容器元信息
docker inspect f1178d5b0bd8
===========================
#进入容器内
docker exec -it 容器id 
============================
# 从容器拷贝文件到主机上
docker cp 容器id：文件路径  本地地址

```
# commit
``` shell
# 本地提交镜像
# 命令和git原理类似
docker commit -m="描述信息" -a="作者" 容器id 目标镜像名:[TAG]


docker commit -a="kuangshen" -m="add webapps app" 容器id tomcat02:1.0

```
# 容器数据卷
容器内存储的文件系统，都同步映射在本地系统之中。双向文件系统
``` shell
# 三种挂载： 匿名挂载、具名挂载、指定路径挂载
-v 容器内路径			#匿名挂载
-v 卷名：容器内路径		#具名挂载
-v /宿主机路径：容器内路径 #指定路径挂载 docker volume ls 是查看不到的

# 匿名挂载  
docker run -d -P --name nginx01 -v /etc/nginx nginx
docker volume ls
# 具名挂载
docker run -d -P --name nginx02 -v juming-nginx:/etc/nginx nginx
# 指定路径
docker run -it -v /home/ceshi:/home centos /bin/bash
```
# Docker File
一连套执行脚本
```shell
FROM			# 基础镜像，一切从这里开始构建
MAINTAINER	# 镜像是谁写的， 姓名+邮箱
RUN				# 镜像构建的时候需要运行的命令
ADD				# 步骤，tomcat镜像，这个tomcat压缩包！添加内容 添加同目录
WORKDIR			# 镜像的工作目录
VOLUME			# 挂载的目录
EXPOSE			# 保留端口配置
CMD				# 指定这个容器启动的时候要运行的命令，只有最后一个会生效，可被替代。 如 ls -a 增加 -l  就替换成了 -l 
ENTRYPOINT	# 指定这个容器启动的时候要运行的命令，可以追加命令
ONBUILD			# 当构建一个被继承 DockerFile 这个时候就会运行ONBUILD的指令，触发指令。
COPY			# 类似ADD，将我们文件拷贝到镜像中
ENV				# 构建的时候设置环境变量！
```
### 命令 docker build -f 文件路径 -t 镜像名:[tag] .
```python
# 2.通过这个文件构建镜像
# 命令 docker build -f 文件路径 -t 镜像名:[tag] .
docker build -f mydockerfile-centos -t mycentos:0.1 .
```
# Docker 网络