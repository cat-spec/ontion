# 起步工作

# 基础操作
## 图片的读取展示
```python
def cvphoto():  
    # 读取图片  
    # cv2.IMREAD_COLOR 彩色  cv2.IMREAD_GRAYSCALE  灰色
    img = cv2.imread('./demo1.png', cv2.IMREAD_GRAYSCALE)  
    # 保存图片  
    cv2.imwrite('./demo1.png', img)  
    # 展示图片  
    cv2.imshow('img', img)  
    # 间隔毫秒关闭窗口  
    cv2.waitKey(0)
```
## 视频的读取展示
```python
def cvvideo():  
    video=cv2.VideoCapture("demo.mp4")  
    open,frame=video.read()  
    while open:  
        ret, frame=video.read()  
        if frame is None:  
            break  
        if ret == True:  
            gray=cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)  
            cv2.imshow('frame',gray)  
            if cv2.waitKey(1) & 0xFF == ord('q'):  
                break
```
## 截取图片
```python
#第一个参数宽度 第二个长度
slice=img[10:100,0:1000]
```
![[Pasted image 20260325220331.png]]

# 形态操作
## 腐蚀

## 膨胀
## 开关
## 白帽黑帽
