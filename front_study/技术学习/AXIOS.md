# 1. 请求类型
## get请求
## 传递参数
接口文档说明是查询参数或者query，则使用params
1.params传参
```js
{
    url:'http://127.0.0.1:3000',
    params:{
        name:'张三'
    }
}
```
2.路由传值
```js
 url:'http://127.0.0.1:3000?name=张三',
```
## post请求
当接口文档说明是请求体或者body则使用data
```js
 url:'http://hmajax.itheima.net/api/area',
    method:'post',
    data:{
        pname:'湖北省',
        cname:'武汉市'
    }
```
## delete请求