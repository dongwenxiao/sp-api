# sp-api API生成

## 使用

```
import { spApi } from 'sp-api'

const apiService = new spApi(
    Object.assign({}, mongodb, {
        prefix: '/api'
    }),
    serverRouter
)
const collections = [
    'model',
    'model1',
    'model2'
]
collections.forEach((collection) => {
    apiService.add(collection)
})
apiService.mount()
```

## 接口

```
// 生成接口

GET - /api/model?skip=1&limit=2&key1=val1&sort=name:1,age:-1&key1!=val&key2>=10  返回[]
GET - /api/model/:id  返回{}
POST - /api/model  参数data:{key1: '', key2: ''}  返回{}
PUT - /api/model/:id  参数data:{key1: '', key2: ''}  返回{}
DELETE - /api/model/:id  返回{}
```

```
// 返回值

{
  "code": 200,
  "data": {} // 或 []
  "msg": "上传成功"
}
```