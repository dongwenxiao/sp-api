# sp-api API生成

## Example

```
GET - /api/banner?skip=1&limit=2&key1=val1&sort=name:1,age:-1&key1!=val&key2>=10  返回[]
GET - /api/banner/:id  返回{}
POST - /api/banner  参数data:{key1: '', key2: ''}  返回{}
PUT - /api/banner/:id  参数data:{key1: '', key2: ''}  返回{}
DELETE - /api/banner/:id  返回{}
```