import { spMongoDB } from 'sp-mongo'
import cors from 'sp-cors-middleware'
import Router from 'koa-router'

export default class ApiFactory {
    /**
     * Creates an instance of ApiFactory.
     * 
     * @param {any} opt {ip: '', port: '', db: '', prefix: ''} 连接mongodb需要的信息
     * @param {any} router 包含 .use() 方法的对象
     * 
     * @memberOf ApiFactory
     */
    constructor(opt, router) {

        // 维护当前的路由列表
        this.collections = []

        // mongodb 数据库连接信息
        this.ip = opt.ip
        this.port = opt.port
        this.db = opt.db

        // 所有接口URL前缀
        this.urlPrefix = opt.prefix || '/api'

        // koa 路由，主要使用 .use() 挂载
        this.rootRouter = router

        // 当前api路由
        this.router = new Router()

        // 实例化数据库连接对象
        this.dao = new spMongoDB({ ip: this.ip, port: this.port, db: this.db })
    }

    /**
     * 挂载到主路由上
     * 
     * 
     * @memberOf ApiFactory
     */
    mount() {
        const apiRouter = new Router()
        apiRouter.use(this.urlPrefix, this.router.routes(), this.router.allowedMethods())
        this.rootRouter.use(apiRouter)
    }

    addApi(collection) {

        let collectionName

        if (typeof collection === 'string') {
            collectionName = collection
        } else {
            collectionName = collection.name
        }

        this.router
            .options('*', cors, async(ctx) => {
                ctx.status = 204;
            })
            .get(`/${collectionName}`, cors, async(ctx) => {

                // 请求参数
                // {
                //      key1: val1,   // 过滤条件
                //      key2: val2,
                //      skip: 5,    // 跳过5个记录
                //      limit: 10,  // 取10个记录
                //      filter: {   // 子集合过滤
                //          s_key: s_val
                //      }
                // }

                let _query = {},
                    _skip = undefined,
                    _limit = undefined,
                    _filter = undefined

                for (let key in ctx.query) {
                    if (key == 'skip') {
                        _skip = ctx.query[key] - 0
                    } else if (key == 'limit') {
                        _limit = ctx.query[key] - 0
                    } else {
                        let _val = ctx.query[key]
                        if (key.charAt(key.length - 1) == '!') {
                            key = key.slice(0, key.length - 1)
                            _query[key] = { $ne: _val }
                        } else if (key.charAt(key.length - 1) == '>') {
                            key = key.slice(0, key.length - 1)
                            _query[key] = { $gt: parseInt(_val) }
                        } else if (key.charAt(key.length - 1) == '<') {
                            key = key.slice(0, key.length - 1)
                            _query[key] = { $lt: _val }
                        } else if (key.charAt(key.length - 1) == '%') {
                            key = key.slice(0, key.length - 1)
                            _query[key] = { $regex: _val, $options: 'i' }
                        } else {
                            _query[key] = _val
                        }
                    }
                }

                const result = await this.dao.find(collectionName, {
                    _query,
                    _skip,
                    _limit,
                    _filter
                })

                ctx.body = this.response(200, result, '')
            })
            .get(`/${collectionName}/:id`, cors, async(ctx) => {

                let _query = { _id: ctx.params.id }

                const result = await this.dao.find(collectionName, {
                    _query
                })

                ctx.body = this.response(200, result[0], '')
            })
            .post(`/${collectionName}`, cors, async(ctx) => {
                let data = ctx.request.body;
                /*
                // TODO 处理字段类型
                for (let _key in data) {
                    if (mongo.collections[collection][_key] == 'number') {
                        data[_key] = parseInt(data[_key])
                    }
                }*/
                const result = await this.dao.insert(collectionName, data)

                if (result.result.ok === 1) {
                    ctx.body = this.response(200, {
                        id: result.insertedIds[1]
                    }, 'success')
                } else {
                    ctx.body = this.response(200, {
                        id: ''
                    }, 'fail')
                }
            })
            .put(`/${collectionName}`, cors, async(ctx) => {
                let selecter = {},
                    doc = ctx.request.body

                for (let key in ctx.query) {
                    selecter[key] = ctx.query[key]
                }
                /*
                // TODO 处理字段类型
                for (let _key in doc) {
                    if (mongo.collections[collection][_key] == 'number') {
                        doc[_key] = parseInt(doc[_key])
                    }
                }*/

                const { result } = await this.dao.update(collection, selecter, doc)

                if (result.ok > 0) {
                    ctx.body = this.response(200, { affect: result.n }, 'success')
                } else {
                    ctx.body = this.response(200, { affect: result.n }, 'fail')
                }

            })
            .put(`/${collectionName}/:id`, cors, async(ctx) => {

                let selecter = { _id: ctx.params.id },
                    doc = ctx.request.body
                    /*
                    // TODO 处理字段类型
                    for (let _key in doc) {
                        if (mongo.collections[collection][_key] == 'number') {
                            doc[_key] = parseInt(doc[_key])
                        }
                    }*/

                const { result } = await this.dao.update(collectionName, selecter, doc)

                if (result.ok > 0) {
                    ctx.body = this.response(200, { affect: result.n }, 'success')
                } else {
                    ctx.body = this.response(200, { affect: result.n }, 'fail')
                }
            })
            .delete(`/${collectionName}/:id`, cors, async(ctx) => {

                let selecter = { _id: ctx.params.id }

                const { result } = await this.dao.delete(collectionName, selecter)

                if (result.ok > 0) {
                    ctx.body = this.repsonse(200, { affect: result.n }, 'success')
                } else {
                    ctx.body = this.repsonse(200, { affect: result.n }, 'fail')
                }

            })
    }

    deleteApi(collectionName) {

    }

    export () {

    }

    response(code, data, msg, type = 'json') {
        if (type === 'json') {
            return {
                code,
                data,
                msg
            }
        }
    }
}




// 1 消息（1字头）
// ▪ 100 Continue
// ▪ 101 Switching Protocols
// ▪ 102 Processing
// 2 成功（2字头）
// ▪ 200 OK
// ▪ 201 Created
// ▪ 202 Accepted
// ▪ 203 Non-Authoritative Information
// ▪ 204 No Content
// ▪ 205 Reset Content
// ▪ 206 Partial Content
// 3 重定向（3字头）
// ▪ 300 Multiple Choices
// ▪ 301 Moved Permanently
// ▪ 302 Move temporarily
// ▪ 303 See Other
// ▪ 304 Not Modified
// ▪ 305 Use Proxy
// ▪ 306 Switch Proxy
// ▪ 307 Temporary Redirect
// 4 请求错误（4字头）
// ▪ 400 Bad Request
// ▪ 401 Unauthorized
// ▪ 403 Forbidden
// ▪ 404 Not Found
// ▪ 405 Method Not Allowed
// ▪ 406 Not Acceptable
// ▪ 407 Proxy Authentication Required
// ▪ 408 Request Timeout
// ▪ 409 Conflict
// ▪ 410 Gone
// ▪ 411 Length Required
// ▪ 412 Precondition Failed
// ▪ 413 Request Entity Too Large
// ▪ 414 Request-URI Too Long
// ▪ 415 Unsupported Media Type
// ▪ 416 Requested Range Not Satisfiable
// ▪ 417 Expectation Failed
// ▪ 422 Unprocessable Entity
// ▪ 423 Locked
// ▪ 424 Failed Dependency
// ▪ 425 Unordered Collection
// ▪ 426 Upgrade Required
// ▪ 449 Retry With
// 5 服务器错误（5、6字头）
// ▪ 500 Internal Server Error
// ▪ 501 Not Implemented
// ▪ 502 Bad Gateway
// ▪ 503 Service Unavailable
// ▪ 504 Gateway Timeout
// ▪ 505 HTTP Version Not Supported
// ▪ 506 Variant Also Negotiates
// ▪ 507 Insufficient Storage
// ▪ 509 Bandwidth Limit Exceeded
// ▪ 510 Not Extended
// ▪ 600 Unparseable Response Headers