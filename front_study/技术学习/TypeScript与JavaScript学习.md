# JavaScript

## 对象属性方法
## DOM元素
## BOM元素
### 定时器 
```js
window.setTimeout(function, milliseconds);
```
### 延时器
```js
window.setInterval(function, milliseconds);
```

### Location对象
属性
```js
console.log(location);          //输出location对象
console.log(location.href);     //输出当前地址的全路径地址
console.log(location.origin);   //输出当前地址的来源
console.log(location.protocol); //输出当前地址的协议
console.log(location.hostname); //输出当前地址的主机名
console.log(location.host);     //输出当前地址的主机
console.log(location.port);     //输出当前地址的端口号
console.log(location.pathname); //输出当前地址的路径部分
console.log(location.search);   //输出当前地址的?后边的参数部分
```
方法
assign()：用来跳转到其它的页面，作用和直接修改location一样
```js
location.assign("https://www.baidu.com");
```
reload()：用于重新加载当前页面，作用和刷新按钮一样，如果在方法中传递一个true，作为参数，则会强制清空缓存刷新页面
```js
location.reload(true);

```
replace()：可以使用一个新的页面替换当前页面，调用完毕也会跳转页面，它不会生成历史记录，不能使用回退按钮回退
```js
location.replace("https://www.baidu.com");
```
### History对象
属性
```js
console.log(history);           //输出history对象
console.log(history.length);    //可以获取到当成访问的链接数量
```
方法
back()：可以回退到上一个页面，作用和浏览器的回退按钮一样
```js
history.back();
```

forward()：可以跳转到下一个页面，作用和浏览器的前进按钮一样
```js
history.forward();
```
go()：可以用来跳转到指定的页面，它需要一个整数作为参数
1：表示向前跳转一个页面，相当于forward()
2：表示向前跳转两个页面
-1：表示向后跳转一个页面，相当于back()
-2：表示向后跳转两个页面
```js
history.go(-2);
```

---

### Screen对象
属性

方法





## 高级语法
### Exception异常

#### 异常捕获

| 属性      | 描述               |
| :------ | :--------------- |
| name    | 设置或返回错误名         |
| message | 设置或返回错误消息（一条字符串） |

|错误名|描述|
|:--|:--|
|EvalError|已在 eval() 函数中发生的错误|
|RangeError|已发生超出数字范围的错误|
|ReferenceError|已发生非法引用|
|SyntaxError|已发生语法错误|
|TypeError|已发生类型错误|
|URIError|在 encodeURI() 中已发生的错误|
#### 自定义抛出异常
```js
/*该函数接收一个数字，返回它的平方。*/
function foo(num) {
    if (typeof num == "number") {
        return num * num;
    } else {
        throw new TypeError("您输入的是一个非法数字！")
    }
}

console.log(foo(4));
console.log(foo("abc"));

```

```js
/*自定义错误*/
function MyError(message) {
    this.message = "注意：这是自定义的错误"
    this.name = "自定义错误";
}
MyError.prototype = new Error();
try {
    throw new MyError("注意：这是自定义错误类型")
} catch (error) {
    console.log(error.message)
}
```


#### JSON数据类型
#### JSON字符串转JS对象
```js
var jsonStr = '{"name":"孙悟空","age":18,"gender":"男"}';
var obj = JSON.parse(jsonStr);
console.log(obj);
```
#### JS对象转JSON字符串
```js
var obj = {name: "猪八戒", age: 28, gender: "男"};
var jsonStr = JSON.stringify(obj);
console.log(jsonStr);
```

## 5 es6新语法
### 5.1结构赋值
#### 数组结构赋值
```js
 let arr=[1,2,3,4,5];

 let [a,b,c,d,e]=arr;

 console.log(a,b,c,d,e);
```
#### 对象结构赋值
```js
 let person={
  name:"张三",
  age:18,
  sex:"男"
 }
 let {name,age,sex}=person;
 console.log(name,age,sex);
```
复杂对象赋值
```js
//复杂对象的解构赋值
let wangfei = {
    name: "王菲",
    age: 18,
    songs: ["红豆", "流年", "暧昧"],
    history: [
        {name: "窦唯"},
        {name: "李亚鹏"},
        {name: "谢霆锋"}
    ]
};
let {name, age, songs: [one, two, three], history: [first, second, third]} = wangfei;
console.log(name);
console.log(age);
console.log(one);
console.log(two);
console.log(three);
console.log(first);
console.log(second);
console.log(third);
```

### 5.2模板字符串
```js
let name="张三";
console.log(`你好，${name}`);
```
### 5.3简化对象写法
属性名如果等于属性值可以直接缩写
```js
let name = "张三";
let age = 18;
let speak = function () {
    console.log(this.name);
};

//属性和方法简写
let person = {
    name,
    age,
    speak
};

console.log(person.name);
console.log(person.age);
person.speak();
```
#### 5.4 rest 参数
```js
// 作用与 arguments 类似
function add(...args) {
    console.log(args);
}
add(1, 2, 3, 4, 5);

// rest 参数必须是最后一个形参
function minus(a, b, ...args) {
    console.log(a, b, args);
}
minus(100, 1, 2, 3, 4, 5, 19);
```

#### 5.5 spread 扩展运算符
展开数组
```js
let arr=[1,2,3,4,5];
console.log(...arr);
```
展开对象
```js
let obj={
  name:"张三",
  age:18,
  sex:"男"
}
let x={...obj}
console.log(x);
```

###  5.6 迭代器*

### 5.7 Promise
### 5.8 async与await

### 5.9 可选链操作符
当我们要使用传进来的一个属性值的时候，我们不知道这个属性值到底有没有传。
如果元素没有，则不进行后续 **.** 后续运算。
```js
let person=[1,2,3]
console.log(person?.[0]);
```


 