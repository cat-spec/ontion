## 目录

1. Express 简介与核心概念
    
2. 快速起步
    
3. 路由系统
    
4. 中间件：Express 的心脏
    
5. 请求与响应对象进阶
	
6. 数据库链接与操作
	
7. 文件上传与静态资源
    

# 1. Express 简介与核心概念

### 1.1 什么是 Express？

Express 是一个基于 Node.js 平台的极简、灵活的 Web 应用开发框架，它提供了一系列强大的特性，帮助开发者快速构建单页、多页及混合 Web 应用和 API。Express 是 Node.js 生态中最流行的框架，被成千上万的商业应用和开源项目所采用。

**核心特点：**

- 轻量级：只提供 Web 应用核心功能，其他功能通过中间件扩展
    
- 快速：基于 Node.js 异步非阻塞 I/O，性能优异
    
- 学习曲线平缓：API 设计简洁直观
    
- 生态丰富：拥有海量的第三方中间件

# 2. 快速起步

### 2.1 前置要求

- Node.js (v14+ 推荐)
    
- npm 或 yarn 或 pnpm
```js
npm i express //框架主体
npm i nodemon//热加载（保存后自动更新）
//安装后命令行 nodemon app.js启动服务
```
### 2.2 第一个应用：Hello Express
创建app.js文件
```js
const express = require('express');
const app = express();
const port = 3000;
// 路由定义
app.get('/', (req, res) => {
//req为客户端发送的数据集
//res用于向客户端发送响应
  res.send('Hello World!');
});
// 启动服务器
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
```

# 3. 路由系统
### 3.1 基本路由

路由定义格式：`app.METHOD(PATH, HANDLER)`

- `METHOD`：HTTP 方法（get、post、put、delete、patch 等）
    
- `PATH`：URL 路径（支持字符串模式、正则表达式）
    
- `HANDLER`：处理函数

### 3.2路由匹配
#### 3.2.1基本路由
```js
// 匹配 /about
app.get('/about', (req, res) => {
  res.send('About');
});
```
#### 3.2.2参数路由
```js
// 单个参数
app.get('/users?userId', (req, res) => {
  res.send(`User ID: ${req.query.userId}`);
});
// 多个参数
app.get('/posts?postId/comments?commentId', (req, res) => {
  res.send(`Post ${req.query.postId}, Comment ${req.query.commentId}`);
});

// 参数值会自动存储在 req.params 对象中
```
#### 3.2.3正则路由
```js
// 通配符 ? 表示可选
app.get('/ab?cd', (req, res) => {
  res.send('/acd 或 /abcd');
});

// 通配符 + 表示一个或多个
app.get('/ab+cd', (req, res) => {
  res.send('/abcd, /abbcd, /abbbcd 等');
});

// 通配符 * 表示任意
app.get('/ab*cd', (req, res) => {
  res.send('/ab任意内容cd');
});

// 正则表达式
app.get(/.*fly$/, (req, res) => {
  res.send('/butterfly, /dragonfly 等');
  //任何以fly结尾的路径
});
```

## 3.3模块化路由
**routes/users.js**
```js
const express = require('express');
const router = express.Router();

// 中间件只在此路由内生效
router.use((req, res, next) => {
  console.log('Time:', Date.now());
  next();
});

router.get('/', (req, res) => {
  res.send('Users list');
});

router.get('/:id', (req, res) => {
  res.send(`User ${req.params.id}`);
});

router.post('/', (req, res) => {
  res.send('Create user');
});

module.exports = router;
```
**app.js**
```js
const usersRouter = require('./routes/users');
app.use('/users', usersRouter);
//参数一该路由路径前统一加入/users
//参数二需要使用的路由
```


# 4. 中间件
### 4.1 中间件概念

中间件函数可以访问 `req`、`res` 和 `next`。它可以：

- 执行任何代码
    
- 修改请求和响应对象
    
- 结束请求-响应循环
    
- 调用堆栈中的下一个中间件

请求 → 中间件1 → 中间件2 → ... → 路由处理 → 响应

### 4.2 编写第一个中间件

```js
// 最简单的中间件
const myLogger = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next(); // 必须调用，否则请求会挂起
};

app.use(myLogger);
```

### 4.3 中间件类型
#### 4.3.1 应用级中间件
```js
// 无路径，每个请求都执行
app.use((req, res, next) => {
  console.log('Global middleware');
  next();
});

// 特定路径
app.use('/api', (req, res, next) => {
  console.log('API middleware');
  next();
});
```
#### 4.3.2 路由级中间件
写在路由模块的中间件
```js
const router = express.Router();
router.use((req, res, next) => {
  console.log('Router middleware');
  next();
});
```
#### 4.3.3 错误处理中间件
```js
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
```
#### 4.3.4 内置中间件
```js
// 解析 JSON 请求体
app.use(express.json());

// 解析 URL-encoded 请求体（表单数据）
app.use(express.urlencoded({ extended: true }));

// 托管静态文件
app.use(express.static('public'));
```
#### 4.3.5插件中间件
```js
const morgan = require('morgan');     // 日志
const cors = require('cors');         // 跨域
const helmet = require('helmet');     // 安全头
const compression = require('compression'); // 压缩

app.use(morgan('combined'));
app.use(cors());
app.use(helmet());
app.use(compression());
```

## 4.4 中间件执行顺序
中间件的顺序至关重要——按照 `app.use` 的声明顺序执行：
```js
// 正确顺序示例
app.use(express.json());        // 1. 解析 JSON
app.use(morgan('dev'));         // 2. 记录日志
app.use('/api', authMiddleware); // 3. 认证
app.use('/api', apiRoutes);      // 4. 路由
app.use(errorHandler);           // 5. 错误处理（最后）
```

# 5. 请求与响应对象进阶

## 5.1 Request 对象详解

`req` 对象代表 HTTP 请求，包含查询字符串、参数、请求体、HTTP 头等属性。
```js
app.get('/example', (req, res) => {
  // 基本属性
  req.method     // 'GET', 'POST' 等
  req.url        // 完整 URL 路径
  req.path       // 路径部分，不含查询字符串
  req.hostname   // 主机名（不含端口）
  req.ip         // 客户端 IP
  req.protocol   // 'http' 或 'https'
  
  // 请求数据
  req.params     // 路由参数 { id: '123' }
  req.query      // 查询字符串 { page: '2', sort: 'asc' }
  req.body       // 请求体（需要 body-parser 中间件）
  req.cookies    // Cookie 值（需要 cookie-parser）
  req.headers    // 请求头对象
  
  // 高级属性
  req.secure     // 是否为 HTTPS
  req.accepts('html') // 内容协商
});
```

### 5.2 Response 对象详解
`res` 对象代表 HTTP 响应，提供多种方法发送数据。
```js
// 发送字符串或 HTML
res.send('<h1>Hello</h1>');

// 发送 JSON
res.json({ name: 'John', age: 30 });

// 发送文件
res.sendFile('/path/to/file.pdf');

// 下载文件
res.download('/files/report.pdf', 'report.pdf');

// 重定向
res.redirect(301, '/new-location');

// 设置状态码并发送
res.status(404).send('Not Found');

// 链式调用
res.status(201).json({ id: 1 });
```

### 5.3 细节点
#### 1. 查询参数 – `req.query`

- **位置**：URL 中 `?` 后面的键值对。
    
- **示例 URL**：`/search?keyword=express&page=2`
    
- **获取方式**：`req.query` → `{ keyword: 'express', page: '2' }`
    
- **特点**：
    
    - 所有值默认为字符串类型。
        
    - 可选参数，可有可无。
        
    - 路由定义中无需声明。
        
    - 适合过滤、分页、排序等非敏感、非隐私数据。
        
- **HTTP 方法**：常用于 `GET` 请求，也可用于 `POST`/`DELETE` 等（但不符合 RESTful 习惯）。

#### 2. 路由参数 – `req.params`

- **位置**：URL 路径的一部分，通过占位符定义。
    
- **示例**：  
    路由定义：`/user/:id/post/:postId`  
    请求 URL：`/user/123/post/hello`  
    `req.params` → `{ id: '123', postId: 'hello' }`
    
- **特点**：
    
    - 值也是字符串类型。
        
    - 通常是**必需的**（除非路由定义为可选，如 `/:id?`）。
        
    - 必须在路由定义中显式声明占位符（如 `:id`、`:name`）。
        
    - 适合标识资源，如用户 ID、文章编号等。
        
- **HTTP 方法**：任何方法均可使用（`GET`、`POST`、`PUT`、`DELETE` 等）。
    

#### 3. 请求体 – `req.body`

- **位置**：HTTP 请求的消息体（Body）中。
    
- **示例**：  
    发送 JSON 数据：`{ "username": "alice", "age": 25 }`  
    前提：需配置 `express.json()` 中间件。  
    `req.body` → `{ username: 'alice', age: 25 }`
    
- **特点**：
    
    - 可以携带复杂结构（对象、数组、嵌套数据）。
        
    - 支持多种格式（JSON、urlencoded、multipart/form-data 等），需相应中间件解析。
        
    - 数据不在 URL 中暴露，适合传输敏感信息（如密码、token）或大量数据。
        
    - 常用于 `POST`、`PUT`、`PATCH` 等创建/更新资源的请求。
        
- **HTTP 方法**：通常用于需要提交数据的请求（`POST`、`PUT`、`PATCH`），`GET` 请求一般没有 body（规范不推荐）。


# 6. 数据库链接与操作
### 6.1 连接 MongoDB 
```
npm i mongoose
```

```js
const mongoose = require('mongoose');

// 连接数据库
mongoose.connect('mongodb://localhost:3309/myapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => console.log('Connected to MongoDB'));

// 定义 Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  age: Number,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// 在路由中使用
app.post('/users', async (req, res, next) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});
```
### 6.2 连接 MySQL
``` npm
npm i mysql
```
mysql.js文件
```js
const mysql=require('mysql')

const db=mysql.createPool({

    host:'localhost',

    user:'root',

    password:'1234',

    database:'test'

})

  

module.exports=db
```
app.js
```js
const db = require('./mysql')
//？为占位符，要在执行时传入参数
let id='1001'
const studentSQL="delete from student where s_id=?"

db.query(studentSQL,id,(err,results)=>{}
```

## 6.3数据库执行语句
### 单值插入
```js
const sql='insert into table set ?'
db.query('sql语句'，,user,(err,result)=>{})
```
### 多值插入且变量名与数据库内一致
```js
let data={s_id:1001,s_name:'张三',s_brith:18,s_sex:'男'}
const studentSQL="insert into student set ?"
db.query(studentSQL,data,(err,results)=>{}
```
### 修改
```js
 let data={s_id:1001,s_name:'历史',s_brith:18,s_sex:'男'}
 const studentSQL="update student set s_name=? where s_id=1001"
```
### 删除
```js
const studentSQL="delete from student where s_id=1001"
```
## 6.4 sql注入
```js
// 错误（易受攻击）
const userId = req.params.id;
db.query(`SELECT * FROM users WHERE id = ${userId}`);

// 正确（参数化）
db.query('SELECT * FROM users WHERE id = ?', [userId]);

// 使用 ORM
User.findByPk(userId);
```

# 7.  文件上传与静态资源
## 7.1 起步工作
``` npm
npm i multer
```
## 7.2 文件上传
main.js
``` js
//后端主文件
/**
 * Node.js + Express + Multer 文件上传后端服务
 * 运行方式: node server.js
 * 服务地址: http://localhost:3000
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// ==================== 配置文件存储 ====================
// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置Multer的存储引擎
const storage = multer.diskStorage({
    // 指定文件保存的目录
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    // 自定义文件名：时间戳 + 随机数 + 原文件名（防止重名）
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // 获取文件扩展名
        const ext = path.extname(file.originalname);
        // 组合最终文件名
        const filename = uniqueSuffix + ext;
        cb(null, filename);
    }
});

// 文件过滤器（可选：限制文件类型）
const fileFilter = (req, file, cb) => {
    // 允许常见的图片、文档等类型，可根据需要修改
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('不支持的文件类型，仅支持图片、PDF、Word、文本文件'));
    }
};

// 创建multer实例
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 限制文件大小 10MB
    },
    fileFilter: fileFilter
});

// ==================== 静态文件托管 ====================
// 托管上传的文件，使其可通过URL访问
app.use('/uploads', express.static(uploadDir));
// 托管前端页面（当前目录下的index.html）
app.use(express.static(__dirname));

// ==================== 文件上传接口 ====================
/**
 * POST /api/upload
 * 接收前端上传的文件，字段名必须为 'file'
 * 使用 upload.single 处理单个文件上传
 */
app.post('/api/upload', (req, res) => {
    // 使用multer中间件处理上传 只接受file
    upload.single('file')(req, res, (err) => {
        // 处理multer抛出的错误
        if (err) {
            console.error('上传错误:', err);
            let message = '文件上传失败';
            if (err instanceof multer.MulterError) {
                if (err.code === 'FILE_TOO_LARGE') {
                    message = '文件过大，最大支持10MB';
                } else {
                    message = err.message;
                }
            } else if (err.message) {
                message = err.message;
            }
            return res.status(400).json({
                success: false,
                message: message
            });
        }

        // 检查是否有文件上传
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '请选择要上传的文件'
            });
        }

        // 构建文件访问URL
        const fileUrl = `/uploads/${req.file.filename}`;
        
        // 返回成功响应
        res.json({
            success: true,
            message: '文件上传成功',
            data: {
                originalName: req.file.originalname,   // 原始文件名
                savedName: req.file.filename,          // 保存的文件名
                size: req.file.size,                   // 文件大小(字节)
                url: fileUrl,                          // 访问URL
                mimetype: req.file.mimetype            // 文件MIME类型
            }
        });
    });
});

// ==================== 启动服务器 ====================
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`上传接口: http://localhost:${PORT}/api/upload`);
});
```
前端主要代码
```js
const uploadFile = async () => {
                    if (!selectedFile.value) {
                        showMessage('请先选择文件', 'error');
                        return;
                    }
                    
                    // 创建 FormData 对象
                    const formData = new FormData();
                    formData.append('file', selectedFile.value);  // 字段名必须与后端一致('file')
                    
                    uploading.value = true;
                    uploadProgress.value = 0;
                    uploadResult.value = null;
                    
                    try {
                        // 发送 POST 请求到后端上传接口
                        const response = await axios.post('/api/upload', formData, {
                            headers: {
                                'Content-Type': 'multipart/form-data'  // 告诉服务器发送的是文件数据
                            },
                           
                        });

```



## 7.3 静态资源
```js
app.use(express.static('./public'))
```
示例： http://127.0.0.1/xxx   直接访问public下文件，注意无需加上public路径

多个静态资源使用前缀
```js
app.use('/public',express.static('./public'))
```
