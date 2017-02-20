import Router from 'koa-router'
import { spMongoDB } from 'sp-mongo'
import { spResponse, RES_SUCCESS, RES_FAIL_OPERATE } from 'sp-response'
import cors from 'sp-cors-middleware'

export default class spApi {

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

    add(collection) {
        mountCrudRouter(collection, this.router, this.dao)
    }
}

export function mountCrudRouter(collection, router, dao) {

    router = router || this.router
    let collectionName

    if (typeof collection === 'string') {
        collectionName = collection
    } else {
        collectionName = collection.name
    }

    router
        .options('*', cors, async(ctx) => {
            ctx.status = 204
        })
        .get(`/${collectionName}`, cors, spResponse, async(ctx) => {

            // 请求参数
            // {
            //      key1: val1,   // 过滤条件
            //      key2: val2,
            //      skip: 5,    // 跳过5个记录
            //      limit: 10,  // 取10个记录
            //      sort: { key: 1}  // key要排序的键值， 1升序，-1降序  eg: /api/person?sort=name:-1,age:-1
            //      filter: {   // 子集合过滤
            //          s_key: s_val
            //      }
            // }

            let _query = {},
                _skip,
                _limit,
                _filter,
                _sort

            for (let key in ctx.query) {
                if (key === 'skip') {
                    _skip = ctx.query[key] - 0
                } else if (key === 'limit') {
                    _limit = ctx.query[key] - 0
                } else if (key === 'sort') {
                    _sort = {}
                    ctx.query[key].split(',').forEach((str) => {
                        let item = str.split(':')
                        _sort[item[0]] = item[1] * 1
                    })
                } else {
                    let _val = ctx.query[key]
                    if (key.charAt(key.length - 1) === '!') {
                        key = key.slice(0, key.length - 1)
                        _query[key] = { $ne: _val }
                    } else if (key.charAt(key.length - 1) === '>') {
                        key = key.slice(0, key.length - 1)
                        _query[key] = { $gt: parseInt(_val) }
                    } else if (key.charAt(key.length - 1) === '<') {
                        key = key.slice(0, key.length - 1)
                        _query[key] = { $lt: _val }
                    } else if (key.charAt(key.length - 1) === '%') {
                        key = key.slice(0, key.length - 1)
                        _query[key] = { $regex: _val, $options: 'i' }
                    } else {
                        _query[key] = _val
                    }
                }
            }

            // console.log({
            //     _query,
            //     _skip,
            //     _limit,
            //     _filter,
            //     _sort
            // })

            const result = await dao.find(collectionName, {
                _query,
                _skip,
                _limit,
                _filter,
                _sort
            })

            ctx.spResponse(RES_SUCCESS, result, '')
        })
        .get(`/${collectionName}/:id`, cors, spResponse, async(ctx) => {

            let _query = { _id: ctx.params.id }

            const result = await dao.find(collectionName, {
                _query
            })

            ctx.spResponse(RES_SUCCESS, result[0], '')
        })
        .post(`/${collectionName}`, cors, spResponse, async(ctx) => {
            let data = ctx.request.body

            /*
            // TODO 处理字段类型
            for (let _key in data) {
                if (mongo.collections[collection][_key] == 'number') {
                    data[_key] = parseInt(data[_key])
                }
            }*/
            const result = await dao.insert(collectionName, data)

            if (result.result.ok === 1) {
                ctx.spResponse(RES_SUCCESS, {
                    id: result.insertedIds[1]
                }, 'success')
            } else {
                ctx.spResponse(RES_FAIL_OPERATE, {}, 'fail')
            }
        })
        .put(`/${collectionName}`, cors, spResponse, async(ctx) => {
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

            const { result } = await dao.update(collection, selecter, doc)

            if (result.ok > 0) {
                ctx.spResponse(RES_SUCCESS, { affect: result.n }, 'success')
            } else {
                ctx.spResponse(RES_FAIL_OPERATE, { affect: result.n }, 'fail')
            }

        })
        .put(`/${collectionName}/:id`, cors, spResponse, async(ctx) => {

            let selecter = { _id: ctx.params.id },
                doc = ctx.request.body

            /*
            // TODO 处理字段类型
            for (let _key in doc) {
                if (mongo.collections[collection][_key] == 'number') {
                    doc[_key] = parseInt(doc[_key])
                }
            }*/

            const { result } = await dao.update(collectionName, selecter, doc)

            if (result.ok > 0) {
                ctx.spResponse(RES_SUCCESS, { affect: result.n }, 'success')
            } else {
                ctx.spResponse(RES_FAIL_OPERATE, { affect: result.n }, 'fail')
            }
        })
        .delete(`/${collectionName}/:id`, cors, spResponse, async(ctx) => {

            let selecter = { _id: ctx.params.id }

            const { result } = await dao.delete(collectionName, selecter)

            if (result.ok > 0) {
                ctx.spResponse(RES_SUCCESS, { affect: result.n }, 'success')
            } else {
                ctx.spResponse(RES_FAIL_OPERATE, { affect: result.n }, 'fail')
            }

        })

}