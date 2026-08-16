// index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 订阅消息模板 ID（审核结果通知）
// 申请地址：微信公众平台 -> 功能 -> 订阅消息
// 留空则跳过推送，不影响审核流程
const SUBSCRIBE_TEMPLATE_ID = 'QJiFxbJ7bE7rlhERmDOm7hahgyY4h6E4rQ7Q8aJrKmE'

// 打卡模式积分：实地 / 回忆 / 云打卡
const CHECKIN_POINTS = { onSite: 20, memory: 10, cloud: 5 }
// 实地打卡距离校验半径（公里）。种子坐标为近似值，适当放宽
const CHECKIN_RADIUS_KM = 1.5

exports.main = async (event, context) => {
  const { url, method, data, token } = event
  const wxContext = cloud.getWXContext()
  const OPENID = wxContext.OPENID

  console.log('Request:', method, url, data, OPENID)

  // 1. 登录 (WeChat Login)
  if (url === '/wechat/login') {
    return handleWechatLogin(OPENID)
  }
  
  // 2. 账号密码登录 (模拟，云开发通常推荐微信一键登录)
  if (url === '/login') {
      // 简单模拟，实际应查数据库
      return handleAccountLogin(data)
  }

  // 3. 获取用户信息
  if (url === '/getInfo') {
    return handleGetInfo(OPENID)
  }

  // 4. 上报相关
  if (url.startsWith('/system/report')) {
    if (method === 'POST' && url === '/system/report') return handleAddReport(data, OPENID)
    if (method === 'POST' && url === '/system/report/like') return handleLikeReport(data, OPENID)
    if (method === 'POST' && url === '/system/report/delete') return handleDeleteReport(data, OPENID) // 允许用户调用删除
    if (method === 'GET' && url.includes('/list')) return handleListReport(data, OPENID)
    if (method === 'GET' && url.includes('/detail')) {
        // 提取 ID: /system/report/detail/{id}
        const parts = url.split('/detail/')
        if (parts.length > 1) {
             const id = parts[1].trim() // 去除可能存在的空白字符
             console.log('Extract ID:', id, 'Length:', id.length, 'from URL:', url)
             return handleGetReportDetail(id, OPENID)
        }
    }
  }
  
  // 5. 排行榜
  if (url.startsWith('/system/user/rank')) {
      return handleRank(url)
  }

  // 4.5 打卡点相关
  if (url === '/spots/list') return handleListSpots(data, OPENID)
  if (url === '/spots/detail') return handleSpotDetail(data, OPENID)
  if (url === '/spots/provinces') return handleListProvinces(data, OPENID)
  if (url === '/spots/checkin') return handleCheckin(data, OPENID)
  if (url === '/spots/my') return handleMyStamps(data, OPENID)

  // 4.6 管理员导入打卡点
  if (url === '/seed/spots') return handleSeedSpots(data, OPENID)

  // 6. 管理员审核
  if (url === '/admin/report/audit') {
    return handleAuditReport(data, OPENID)
  }
  
  // 7. 管理员获取待审核列表
  if (url === '/admin/report/list') {
    return handleAdminListReport(data, OPENID)
  }
  
  // 9. 管理员删除上报
  if (url === '/admin/report/delete') {
    return handleDeleteReport(data, OPENID)
  }

  // 8. 用户更新信息
  if (url === '/user/update') {
    return handleUpdateUser(data, OPENID)
  }

  // 10. 商品列表
  if (url === '/shop/list') {
      return handleGetProductList(data)
  }

  // 11. 兑换商品
  if (url === '/shop/redeem') {
      return handleRedeemProduct(data, OPENID)
  }

  // 12. 导入官方示例内容（仅管理员）
  if (url === '/seed/content') {
    return handleSeedContent(data, OPENID)
  }

  return {
    code: 404,
    msg: 'Not Found: ' + url
  }
}

// --- Handlers ---

async function handleGetReportDetail(id, openid) {
  try {
    console.log('Querying report with ID:', id, 'Type:', typeof id)

    // 直接尝试 where 查询
    const listRes = await db.collection('reports').where({ _id: id }).get()
    
    if (listRes.data.length === 0) {
        console.log('Report not found for ID:', id)
        return { code: 404, msg: '记录不存在' }
    }
    
    const report = listRes.data[0]
    console.log('Report found:', report._id)
    
    // 权限检查：
    // 1. 管理员 -> 可见
    // 2. 作者本人 -> 可见
    // 3. 审核通过 -> 可见
    const isAdmin = await checkAdmin(openid)
    if (!isAdmin && report.openid !== openid && report.status !== '1') {
       return { code: 403, msg: '无权查看' }
    }
    
    // 检查是否点赞
    let isLiked = false
    try {
        const likeRes = await db.collection('likes').where({
            reportId: id,
            openid: openid
        }).count()
        isLiked = likeRes.total > 0
    } catch (e) {
        console.warn('Check like status failed (likes collection might not exist):', e)
    }
    
    // 查询用户信息获取昵称和头像
    let nickName = '微信用户'
    let avatarUrl = ''
    try {
        const userRes = await db.collection('users').where({ openid: report.openid }).get()
        if (userRes.data.length > 0) {
            nickName = userRes.data[0].nickName || '微信用户'
            avatarUrl = userRes.data[0].avatarUrl || ''
        }
    } catch (e) {
        console.warn('Get user info failed:', e)
    }
    
    return {
      code: 200,
      data: {
          ...report,
          nickName: nickName,
          avatarUrl: avatarUrl,
          isLiked: isLiked
      }
    }
  } catch (e) {
    console.error('Get detail failed:', e)
    return { code: 500, msg: '获取详情失败: ' + e.message }
  }
}

async function handleLikeReport(data, openid) {
    const { id, isLike } = data
    const dbCmd = db.command
    
    try {
        if (isLike) {
            // 点赞
            // 1. 检查是否已点赞
            let countRes = { total: 0 }
            try {
                countRes = await db.collection('likes').where({
                    reportId: id,
                    openid: openid
                }).count()
            } catch (e) {
                // 如果集合不存在，尝试创建（云函数无法创建集合，需手动）
                // 这里只能抛出更友好的错误
                 if (e.errCode === -502005) {
                     return { code: 500, msg: '请联系管理员在云数据库创建 "likes" 集合' }
                 }
                 throw e
            }
            
            if (countRes.total === 0) {
                // 2. 添加点赞记录
                await db.collection('likes').add({
                    data: {
                        reportId: id,
                        openid: openid,
                        createTime: new Date()
                    }
                })
                // 3. 增加计数
                await db.collection('reports').doc(id).update({
                    data: {
                        likes: dbCmd.inc(1)
                    }
                })
            }
        } else {
            // 取消点赞
            try {
                const delRes = await db.collection('likes').where({
                    reportId: id,
                    openid: openid
                }).remove()
                
                if (delRes.stats.removed > 0) {
                     // 减少计数
                     await db.collection('reports').doc(id).update({
                        data: {
                            likes: dbCmd.inc(-1)
                        }
                    })
                }
            } catch (e) {
                console.warn('Cancel like failed:', e)
            }
        }
        return { code: 200, msg: '操作成功' }
    } catch (e) {
        console.error(e)
        return { code: 500, msg: '操作失败: ' + (e.msg || e.message) }
    }
}

// 简单硬编码管理员 OpenID，实际生产建议存在数据库 role 字段
const ADMIN_OPENIDS = [
  'ozX-s5...', // 替换为你自己的 OpenID，可以在调试控制台看到
]

async function checkAdmin(openid) {
  // 方式1：硬编码检查
  // if (ADMIN_OPENIDS.includes(openid)) return true
  
  // 方式2：查库检查 role='admin'
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length > 0 && userRes.data[0].role === 'admin') {
    return true
  }
  return false
}

async function handleDeleteReport(data, openid) {
  const { id } = data
  try {
    // 1. 获取记录
    const reportRes = await db.collection('reports').doc(id).get()
    if (!reportRes.data) {
      return { code: 404, msg: '记录不存在' }
    }
    const report = reportRes.data

    // 2. 权限判断
    const isAdmin = await checkAdmin(openid)
    
    // 非管理员只能删除自己的记录
    // 允许删除自己发布（含已通过）的记录；删除已通过记录会自动回滚积分/印章/打卡人数
    if (!isAdmin) {
      if (report.openid !== openid) {
        return { code: 403, msg: '无权操作' }
      }
    }
    
    // 3. 删除上报记录
    await db.collection('reports').doc(id).remove()
    
    // 4. 删除相关的点赞记录 (可选，保持数据清洁)
    try {
        await db.collection('likes').where({ reportId: id }).remove()
    } catch (e) {
        // 忽略 likes 集合不存在的错误
    }

    // 5. 已通过的记录删除后做数据回滚（保持积分/印章一致）：
    //    - 扣回发放的积分（不超过用户当前积分，积分不为负）
    //    - 若是打卡记录，移除用户的印章并减少打卡点计数
    if (report.status === '1' && (report.awardedPoints || report.spotCode)) {
      try {
        if (report.openid) {
          // 读取用户当前积分，扣减额度取"应扣积分"与"实际积分"的较小值，避免积分为负
          const userRes = await db.collection('users').where({ openid: report.openid }).get()
          const currentPoints = (userRes.data[0] && userRes.data[0].points) || 0
          const deduct = Math.min(report.awardedPoints || 0, currentPoints)
          const userUpdate = { points: _.inc(-deduct) }
          if (report.spotCode) {
            userUpdate.stamps = _.pull(report.spotCode)
          }
          await db.collection('users').where({ openid: report.openid }).update({
            data: userUpdate
          })
        }
        // 打卡点计数减一
        if (report.spotCode) {
          const spotRes = await db.collection('spots').where({ code: report.spotCode }).get()
          if (spotRes.data.length > 0) {
            await db.collection('spots').doc(spotRes.data[0]._id).update({
              data: { checkinCount: _.inc(-1) }
            })
          }
        }
      } catch (e) {
        // 回滚失败不影响删除本身，仅记录日志
        console.warn('删除已通过记录后的数据回滚失败:', e)
      }
    }
    
    return { code: 200, msg: '删除成功' }
  } catch (e) {
    console.error('Delete report failed:', e)
    return { code: 500, msg: '删除失败: ' + e.message }
  }
}

async function handleUpdateUser(data, openid) {
  try {
    const { nickName, avatarUrl } = data
    const updateData = {}
    if (nickName) updateData.nickName = nickName
    if (avatarUrl) updateData.avatarUrl = avatarUrl
    
    // 如果 token 是 _id，也需要支持。这里简单假设用户已登录且 openid 匹配
    await db.collection('users').where({ openid }).update({
      data: updateData
    })
    
    return { code: 200, msg: '更新成功' }
  } catch (e) {
    console.error(e)
    return { code: 500, msg: '更新失败' }
  }
}

async function handleWechatLogin(openid) {
  // 检查用户是否存在
  const userRes = await db.collection('users').where({ openid }).get()
  
  if (userRes.data.length === 0) {
    // 注册新用户
    await db.collection('users').add({
      data: {
        openid,
        username: '微信用户',
        nickName: '微信用户',
        avatar: '',
        points: 0,
        createTime: new Date(),
        status: '0'
      }
    })
  }
  
  return {
    code: 200,
    token: openid, // 简单使用 openid 作为 token
    msg: '登录成功'
  }
}

async function handleAccountLogin(data) {
    // 简单的账号登录实现，查找 users 集合
    const { username, password } = data
    const userRes = await db.collection('users').where({ username, password }).get()
    
    if (userRes.data.length > 0) {
        return {
            code: 200,
            token: userRes.data[0]._id, // 使用 _id 或 openid
            msg: '登录成功'
        }
    }
    return { code: 500, msg: '账号或密码错误' }
}

async function handleGetInfo(openid) {
  // 如果 token 是 _id (账号登录)
  let userRes = await db.collection('users').where({ openid }).get()
  
  // 兼容账号登录的情况，如果 openid 查不到，尝试用 _id 查
  if (userRes.data.length === 0) {
      userRes = await db.collection('users').doc(openid).get().catch(() => ({ data: null }))
      if (!userRes.data) {
          return { code: 401, msg: '用户不存在' }
      }
  }
  
  const user = userRes.data[0] || userRes.data
  
  // 统计上报数量
  const reportCount = await db.collection('reports').where({ openid: user.openid }).count()
  
  // 印章数
  const stampCount = (user.stamps && user.stamps.length) || 0
  
  // 计算排名
  // 简单逻辑：查询比当前用户积分高的人数 + 1
  const rankRes = await db.collection('users').where({
    points: _.gt(user.points || 0)
  }).count()
  
  return {
    code: 200,
    user: { ...user, stampCount },
    reportCount: reportCount.total,
    weeklyRank: rankRes.total + 1
  }
}

async function handleAddReport(data, openid) {
  await db.collection('reports').add({
    data: {
      ...data,
      openid,
      createTime: new Date(),
      status: '0' // 0=Pending
    }
  })
  return { code: 200, msg: '上报成功' }
}

async function handleListReport(query, openid) {
  const dbCmd = db.command
  let where = {}
  
  // 逻辑调整：
  // 1. 如果指定了 status='1' (审核通过)，则所有人可见 (首页地图、广场)
  // 2. 如果没有指定 status，则认为是用户查看自己的历史记录 (需要 openid 过滤)
  // 3. 管理员可以查看所有 (但通常管理员走 handleAdminListReport)
  
  if (query.status === '1') {
      where.status = '1'
      if (query.openid) {
          where.openid = query.openid
      }
  } else {
      const isAdmin = await checkAdmin(openid)
      if (!isAdmin) {
          where.openid = openid
      } else if (query.openid) {
          where.openid = query.openid
      }
      
      if (query.status) {
          where.status = query.status
      }
  }
  
  if (query._id) {
      where._id = query._id
      delete where.openid
  }

  // 简单列表查询
  const orderBy = query.orderByColumn || 'createTime'
  const orderType = query.isAsc || 'desc'

  const res = await db.collection('reports')
    .where(where)
    .orderBy(orderBy, orderType)
    .get()
  
  // 获取所有上报记录的作者 openid 列表
  const openids = [...new Set(res.data.map(item => item.openid).filter(Boolean))]
  
  // 批量查询用户信息
  let userMap = {}
  if (openids.length > 0) {
      try {
          const userRes = await db.collection('users').where({
              openid: dbCmd.in(openids)
          }).get()
          userMap = userRes.data.reduce((map, user) => {
              map[user.openid] = user
              return map
          }, {})
      } catch (e) {
          console.warn('Get users info failed:', e)
      }
  }
  
  // 合并用户信息到上报记录
  const rows = res.data.map(item => {
      const user = userMap[item.openid] || {}
      return {
          ...item,
          nickName: user.nickName || '微信用户',
          avatarUrl: user.avatarUrl || ''
      }
  })
    
  return {
    code: 200,
    rows: rows,
    total: rows.length
  }
}

async function handleRank(url) {
    const type = url.split('/').pop() // 'week', 'month', 'total', 'stamps-week'
    
    // 本周集章榜：统计本周内成功打卡的印章数
    if (type === 'stamps-week') {
        const startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        const day = startDate.getDay() || 7
        startDate.setDate(startDate.getDate() - day + 1)
        const $ = db.command.aggregate
        try {
            const res = await db.collection('reports')
                .aggregate()
                .match({
                    status: '1',
                    spotCode: _.exists(true),
                    createTime: _.gte(startDate)
                })
                .group({
                    _id: '$openid',
                    stamps: $.sum(1)
                })
                .sort({
                    stamps: -1
                })
                .limit(20)
                .lookup({
                    from: 'users',
                    localField: '_id',
                    foreignField: 'openid',
                    as: 'userInfo'
                })
                .end()
            const rows = res.list.map(item => {
                const user = (item.userInfo && item.userInfo[0]) || {}
                return {
                    openid: item._id,
                    stamps: item.stamps,
                    nickName: user.nickName || '微信用户',
                    avatarUrl: user.avatarUrl || ''
                }
            })
            return {
                code: 200,
                rows: rows
            }
        } catch (e) {
            console.error('Stamps rank aggregation failed:', e)
            return { code: 500, msg: '获取集章榜失败' }
        }
    }
    
    // 总榜：直接查 users 表的 points 字段
    if (type === 'total') {
        const res = await db.collection('users')
            .orderBy('points', 'desc')
            .limit(20)
            .get()
        return {
            code: 200,
            rows: res.data
        }
    }

    // 周榜/月榜：聚合 reports 表
    let startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    
    if (type === 'week') {
        // 本周一
        const day = startDate.getDay() || 7
        startDate.setDate(startDate.getDate() - day + 1)
    } else if (type === 'month') {
        // 本月1号
        startDate.setDate(1)
    } else {
        // 默认总榜
        const res = await db.collection('users')
            .orderBy('points', 'desc')
            .limit(20)
            .get()
        return {
            code: 200,
            rows: res.data
        }
    }
    
    const $ = db.command.aggregate
    try {
        const res = await db.collection('reports')
            .aggregate()
            .match({
                status: '1',
                auditTime: _.gte(startDate)
            })
            .group({
                _id: '$openid',
                points: $.sum('$awardedPoints')
            })
            .sort({
                points: -1
            })
            .limit(20)
            .lookup({
                from: 'users',
                localField: '_id',
                foreignField: 'openid',
                as: 'userInfo'
            })
            .end()
            
        // 格式化返回数据
        const rows = res.list.map(item => {
            const user = (item.userInfo && item.userInfo[0]) || {}
            return {
                openid: item._id,
                points: item.points,
                nickName: user.nickName || '微信用户',
                avatarUrl: user.avatarUrl || ''
            }
        })
        
        return {
            code: 200,
            rows: rows
        }
    } catch (e) {
        console.error('Rank aggregation failed:', e)
        return { code: 500, msg: '获取榜单失败' }
    }
}

async function handleAuditReport(data, openid) {
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { code: 403, msg: '无权操作' }
  }

  const { id, status, remark, points } = data
  // id 是记录的 _id
  
  try {
    const reportRes = await db.collection('reports').doc(id).get()
    const report = reportRes.data
    const targetOpenid = report.openid

    // 首次打卡奖励计算：
    // 查询该用户是否已有其他审核通过的记录（排除当前记录），若没有则视为首次通过，额外奖励 5 分
    let bonus = 0
    if (status === '1') {
      const approvedCount = await db.collection('reports').where({
        openid: targetOpenid,
        status: '1',
        _id: _.neq(id)
      }).count()
      if (approvedCount.total === 0) {
        bonus = 5 // 首次打卡奖励积分
      }
    }

    // 更新状态
    await db.collection('reports').doc(id).update({
      data: {
        status: status, // '1'=通过, '2'=驳回
        remark: remark || '',
        auditTime: new Date(),
        auditor: openid,
        awardedPoints: status === '1' ? points + bonus : 0, // 记录获得的积分（含首次奖励 bonus）
        bonus: bonus // 首次打卡奖励积分（非首次为 0）
      }
    })

    // 如果审核通过，给用户加分（含首次打卡奖励 bonus）
    if (status === '1' && points > 0) {
      // 原子操作自增
      await db.collection('users').where({ openid: targetOpenid }).update({
        data: {
          points: _.inc(points + bonus)
        }
      })
    }

    // 审核结果订阅消息推送（仅配置了模板 ID 时执行）
    // 注意：字段名（thing1/phrase2/time3/thing4）为示例，若与用户的订阅消息模板不匹配，请自行按模板字段调整
    if (SUBSCRIBE_TEMPLATE_ID) {
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: report.openid,
          templateId: SUBSCRIBE_TEMPLATE_ID,
          page: 'pages/index/index',
          data: {
            thing23: { value: (report.description || '文明打卡').slice(0, 20) },
            phrase5: { value: status === '1' ? '审核通过' : '已驳回' },
            date7: { value: new Date().toLocaleDateString() },
            thing11: { value: (remark || '暂无备注').slice(0, 20) }
          }
        })
      } catch (e) {
        // 推送失败不影响审核流程，仅记录日志
        console.warn('订阅消息推送失败:', e)
      }
    }

    return { code: 200, msg: '审核完成' }
  } catch (e) {
    console.error(e)
    return { code: 500, msg: '操作失败' }
  }
}

async function handleAdminListReport(data, openid) {
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { code: 403, msg: '无权操作' }
  }
  
  // 按照创建时间倒序排列，最新的在最上面
  const res = await db.collection('reports')
    .orderBy('createTime', 'desc')
    .get()
  
  // 获取所有上报记录的作者 openid 列表
  const openids = [...new Set(res.data.map(item => item.openid).filter(Boolean))]
  
  // 批量查询用户信息
  let userMap = {}
  if (openids.length > 0) {
      try {
          const userRes = await db.collection('users').where({
              openid: db.command.in(openids)
          }).get()
          userMap = userRes.data.reduce((map, user) => {
              map[user.openid] = user
              return map
          }, {})
      } catch (e) {
          console.warn('Get users info failed:', e)
      }
  }
  
  // 合并用户信息到上报记录
  const rows = res.data.map(item => {
      const user = userMap[item.openid] || {}
      return {
          ...item,
          nickName: user.nickName || '微信用户',
          avatarUrl: user.avatarUrl || ''
      }
  })
    
  return {
    code: 200,
    rows: rows
  }
}

// 导入示例打卡内容（仅管理员）
// 示例为「城市微光」新玩法的打卡动态（带 seedKey 去重，可重复调用；导入 v2 时会自动清理旧版 v1 示例）
async function handleSeedContent(data, openid) {
  // 1. 管理员权限校验：非管理员禁止导入
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) {
    return { code: 403, msg: '无权操作' }
  }

  try {
    // 2. 去重校验：若已导入过 v2 示例，直接返回，避免重复插入
    const seedCount = await db.collection('reports').where({ seedKey: 'official_seed_v2' }).count()
    if (seedCount.total > 0) {
      return { code: 200, msg: '示例内容已导入，无需重复导入' }
    }

    // 2.5 清理旧版示例（v1：老"文明打卡"示例数据）
    try {
      await db.collection('reports').where({ seedKey: 'official_seed_v1' }).remove()
    } catch (e) {
      console.warn('清理旧版示例失败:', e)
    }

    // 3. 示例打卡动态（打卡点与 spots-seed.json 中的 code 对应）
    const now = Date.now()
    const day = 24 * 60 * 60 * 1000
    const seedList = [
      {
        type: 'spot', spotCode: 'bj-001', spotName: '故宫博物院', mode: 'onSite',
        description: '红墙黄瓦，紫禁城的秋天太美了，第一枚印章到手！',
        latitude: 39.9163, longitude: 116.3972, address: '北京·故宫博物院',
        media: [{ type: 'image', url: '/static/images/icon.png' }],
        images: '/static/images/icon.png',
        status: '1', autoApproved: true, awardedPoints: 20, likes: 36,
        seedKey: 'official_seed_v2', createTime: new Date(now - 2 * day), auditTime: new Date(now - 2 * day)
      },
      {
        type: 'spot', spotCode: 'sh-001', spotName: '外滩', mode: 'memory',
        description: '之前出差路过拍的外滩，补个回忆打卡，夜景yyds',
        latitude: 31.24, longitude: 121.49, address: '上海·外滩',
        media: [{ type: 'image', url: '/static/images/icon.png' }],
        images: '/static/images/icon.png',
        status: '1', autoApproved: true, awardedPoints: 10, likes: 21,
        seedKey: 'official_seed_v2', createTime: new Date(now - 3 * day), auditTime: new Date(now - 3 * day)
      },
      {
        type: 'spot', spotCode: 'zj-001', spotName: '西湖', mode: 'onSite',
        description: '西湖边走走停停，三潭印月的日落太治愈了',
        latitude: 30.2425, longitude: 120.15, address: '浙江·杭州·西湖',
        media: [{ type: 'image', url: '/static/images/icon.png' }],
        images: '/static/images/icon.png',
        status: '1', autoApproved: true, awardedPoints: 20, likes: 18,
        seedKey: 'official_seed_v2', createTime: new Date(now - 1 * day), auditTime: new Date(now - 1 * day)
      },
      {
        type: 'spot', spotCode: 'cq-001', spotName: '洪崖洞', mode: 'memory',
        description: '去年去的洪崖洞，千与千寻同款夜景，下次还想去',
        latitude: 29.5627, longitude: 106.579, address: '重庆·洪崖洞',
        media: [{ type: 'image', url: '/static/images/icon.png' }],
        images: '/static/images/icon.png',
        status: '1', autoApproved: true, awardedPoints: 10, likes: 12,
        seedKey: 'official_seed_v2', createTime: new Date(now - 5 * day), auditTime: new Date(now - 5 * day)
      },
      {
        type: 'spot', spotCode: 'sc-004', spotName: '宽窄巷子', mode: 'onSite',
        description: '宽窄巷子喝茶摆龙门阵，巴适得板！',
        latitude: 30.67, longitude: 104.056, address: '四川·成都·宽窄巷子',
        media: [{ type: 'image', url: '/static/images/icon.png' }],
        images: '/static/images/icon.png',
        status: '1', autoApproved: true, awardedPoints: 20, likes: 9,
        seedKey: 'official_seed_v2', createTime: new Date(now - 6 * day), auditTime: new Date(now - 6 * day)
      },
      {
        type: 'spot', spotCode: 'gd-001', spotName: '广州塔', mode: 'cloud',
        description: '云打卡广州塔！小蛮腰下次一定要实地去看',
        latitude: 23.106, longitude: 113.324, address: '广东·广州·广州塔',
        media: [],
        images: '',
        status: '1', autoApproved: true, awardedPoints: 5, likes: 6,
        seedKey: 'official_seed_v2', createTime: new Date(now - 4 * day), auditTime: new Date(now - 4 * day)
      }
    ]

    // 4. 逐条插入示例内容，并同步打卡点计数
    for (const item of seedList) {
      await db.collection('reports').add({ data: item })
      if (item.spotCode) {
        try {
          const spotRes = await db.collection('spots').where({ code: item.spotCode }).get()
          if (spotRes.data.length > 0) {
            await db.collection('spots').doc(spotRes.data[0]._id).update({
              data: { checkinCount: _.inc(1) }
            })
          }
        } catch (e) {
          console.warn('同步打卡点计数失败:', e)
        }
      }
    }

    return { code: 200, msg: `示例内容导入成功（${seedList.length} 条打卡动态）` }
  } catch (e) {
    console.error('Seed content failed:', e)
    return { code: 500, msg: '导入失败: ' + e.message }
  }
}

// --- Spots Handlers ---

const SPOT_STATUS = { ACTIVE: 'active', PENDING: 'pending' }

// 计算两点球面距离（公里）
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const rad = d => d * Math.PI / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// 打卡点列表：支持省份/城市/分类筛选与附近查找，标注当前用户是否已收集
async function handleListSpots(data, openid) {
  try {
    const { province, city, category, lat, lng, radius, limit = 100, offset = 0 } = data || {}
    const where = { status: SPOT_STATUS.ACTIVE }
    if (province) where.province = province
    if (city) where.city = city
    if (category) where.category = category

    let rows = await db.collection('spots').where(where).limit(1000).get()
    rows = rows.data

    // 附近筛选
    if (lat && lng) {
      const r = radius || 50 // km
      rows = rows.filter(s => haversineKm(lat, lng, s.lat, s.lng) <= r)
    }

    // 按省份-城市排序，同城排在一起
    rows.sort((a, b) => (a.province + a.city).localeCompare(b.province + b.city) || a.code.localeCompare(b.code))

    const total = rows.length
    rows = rows.slice(offset, offset + limit)

    // 用户已收集印章
    let stamps = []
    try {
      const userRes = await db.collection('users').where({ openid }).get()
      stamps = (userRes.data[0] && userRes.data[0].stamps) || []
    } catch (e) {
      console.warn('Get user stamps failed:', e)
    }

    rows = rows.map(s => ({
      ...s,
      checkedIn: stamps.includes(s.code)
    }))

    return { code: 200, rows, total }
  } catch (e) {
    console.error('List spots failed:', e)
    return { code: 500, msg: '获取打卡点失败: ' + e.message }
  }
}

// 打卡点详情
async function handleSpotDetail(data, openid) {
  try {
    const { code } = data || {}
    const res = await db.collection('spots').where({ code, status: SPOT_STATUS.ACTIVE }).get()
    if (res.data.length === 0) return { code: 404, msg: '打卡点不存在' }
    const spot = res.data[0]
    let checkedIn = false
    try {
      const userRes = await db.collection('users').where({ openid }).get()
      checkedIn = !!(userRes.data[0] && userRes.data[0].stamps && userRes.data[0].stamps.includes(code))
    } catch (e) {
      console.warn('Get user stamps failed:', e)
    }
    return { code: 200, data: { ...spot, checkedIn } }
  } catch (e) {
    console.error('Spot detail failed:', e)
    return { code: 500, msg: '获取打卡点失败: ' + e.message }
  }
}

// 省份列表与收集进度（用于地图筛选与印章册）
async function handleListProvinces(data, openid) {
  try {
    const res = await db.collection('spots').where({ status: SPOT_STATUS.ACTIVE }).limit(1000).get()
    const spots = res.data
    const map = {}
    spots.forEach(s => {
      if (!map[s.province]) map[s.province] = { province: s.province, total: 0, cities: new Set() }
      map[s.province].total++
      map[s.province].cities.add(s.city)
    })
    let stamps = []
    try {
      const userRes = await db.collection('users').where({ openid }).get()
      stamps = (userRes.data[0] && userRes.data[0].stamps) || []
    } catch (e) {
      console.warn('Get user stamps failed:', e)
    }
    const rows = Object.values(map).map(m => {
      const collected = spots.filter(s => s.province === m.province && stamps.includes(s.code)).length
      return { province: m.province, total: m.total, collected, cities: [...m.cities] }
    })
    rows.sort((a, b) => a.province.localeCompare(b.province))
    return { code: 200, rows }
  } catch (e) {
    console.error('List provinces failed:', e)
    return { code: 500, msg: '获取省份列表失败: ' + e.message }
  }
}

// 打卡：实地/回忆/云。预置打卡点提交即通过并即时发放积分、点亮印章
async function handleCheckin(data, openid) {
  try {
    const { spotCode, mode, description, media, images, latitude, longitude, address } = data || {}
    if (!spotCode) return { code: 400, msg: '缺少打卡点' }
    if (!CHECKIN_POINTS[mode]) return { code: 400, msg: '无效的打卡模式' }

    const spotRes = await db.collection('spots').where({ code: spotCode }).get()
    if (spotRes.data.length === 0) return { code: 404, msg: '打卡点不存在' }
    const spot = spotRes.data[0]
    if (spot.status !== SPOT_STATUS.ACTIVE) return { code: 403, msg: '该打卡点待审核' }

    // 每个用户每个打卡点只能收集一次印章
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) return { code: 401, msg: '请先登录' }
    const user = userRes.data[0]
    if (user.stamps && user.stamps.includes(spotCode)) {
      return { code: 400, msg: '已收集过该印章，去集齐下一个吧' }
    }

    // 实地打卡距离校验
    if (mode === 'onSite') {
      if (!latitude || !longitude) return { code: 400, msg: '请开启定位后再实地打卡' }
      const dist = haversineKm(latitude, longitude, spot.lat, spot.lng)
      if (dist > CHECKIN_RADIUS_KM) {
        return { code: 400, msg: `距打卡点约 ${dist.toFixed(1)}km，需在 ${CHECKIN_RADIUS_KM}km 内才能实地打卡` }
      }
    }

    const awardedPoints = CHECKIN_POINTS[mode]

    // 创建打卡记录（预置打卡点自动通过，无需人工审核）
    await db.collection('reports').add({
      data: {
        type: 'spot',
        spotCode,
        spotName: spot.name,
        mode,
        description: description || '',
        media: media || [],
        images: images || '',
        latitude: latitude || spot.lat,
        longitude: longitude || spot.lng,
        address: address || (spot.city + '·' + spot.name),
        status: '1',
        autoApproved: true,
        openid,
        createTime: new Date(),
        auditTime: new Date(),
        awardedPoints,
        likes: 0
      }
    })

    // 加积分 + 点亮印章
    await db.collection('users').doc(user._id).update({
      data: {
        points: _.inc(awardedPoints),
        stamps: _.push([spotCode])
      }
    })

    // 打卡点计数
    await db.collection('spots').doc(spot._id).update({
      data: { checkinCount: _.inc(1) }
    })

    return { code: 200, msg: '打卡成功，印章已点亮', data: { awardedPoints, mode, spotCode, spotName: spot.name } }
  } catch (e) {
    console.error('Checkin failed:', e)
    return { code: 500, msg: '打卡失败: ' + e.message }
  }
}

// 我的印章：收集记录 + 省份系列进度
async function handleMyStamps(data, openid) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) return { code: 401, msg: '请先登录' }
    const user = userRes.data[0]
    const stamps = user.stamps || []

    // 所有有效打卡点
    const spotsRes = await db.collection('spots').where({ status: SPOT_STATUS.ACTIVE }).limit(1000).get()
    const spots = spotsRes.data

    // 我的打卡记录
    const reportRes = await db.collection('reports')
      .where({ openid, status: '1', spotCode: _.exists(true) })
      .orderBy('createTime', 'desc')
      .get()

    const stampList = reportRes.data.map(r => ({
      spotCode: r.spotCode,
      spotName: r.spotName || '',
      mode: r.mode || '',
      createTime: r.createTime,
      image: (r.media && r.media[0] && r.media[0].url) || r.images || ''
    }))

    // 按省份统计进度
    const provMap = {}
    spots.forEach(s => {
      if (!provMap[s.province]) provMap[s.province] = { province: s.province, total: 0, collected: 0 }
      provMap[s.province].total++
      if (stamps.includes(s.code)) provMap[s.province].collected++
    })
    const provinces = Object.values(provMap).sort((a, b) => a.province.localeCompare(b.province))

    return {
      code: 200,
      data: {
        stamps: stampList,
        provinces,
        totalCollected: stamps.length,
        totalSpots: spots.length
      }
    }
  } catch (e) {
    console.error('My stamps failed:', e)
    return { code: 500, msg: '获取印章失败: ' + e.message }
  }
}

// 管理员导入打卡点（读 spots-seed.json，按 code 去重，可重复调用）
async function handleSeedSpots(data, openid) {
  const isAdmin = await checkAdmin(openid)
  if (!isAdmin) return { code: 403, msg: '无权操作' }
  try {
    const seed = require('./spots-seed.json')
    let inserted = 0
    let skipped = 0
    for (const item of seed) {
      const exist = await db.collection('spots').where({ code: item.code }).count()
      if (exist.total > 0) {
        skipped++
        continue
      }
      await db.collection('spots').add({
        data: { ...item, status: SPOT_STATUS.ACTIVE, checkinCount: 0, createTime: new Date() }
      })
      inserted++
    }
    return { code: 200, msg: `导入完成：新增 ${inserted} 个，跳过 ${skipped} 个` }
  } catch (e) {
    console.error('Seed spots failed:', e)
    return { code: 500, msg: '导入失败: ' + e.message }
  }
}

// --- Shop Handlers ---

const PRODUCTS = [
    {
        id: 'badge_001',
        name: '文明大使',
        description: '热心参与城市文明建设的先行者',
        price: 100,
        type: 'badge',
        icon: '/static/badges/badge_001.png', // 需前端对应资源
        color: '#FFD700'
    },
    {
        id: 'badge_002',
        name: '环保小卫士',
        description: '守护环境，从点滴做起',
        price: 200,
        type: 'badge',
        icon: '/static/badges/badge_002.png',
        color: '#32CD32'
    },
    {
        id: 'badge_003',
        name: '美好家园守护者',
        description: '为社区美好贡献力量的守护神',
        price: 500,
        type: 'badge',
        icon: '/static/badges/badge_003.png',
        color: '#1E90FF'
    },
    {
        id: 'badge_004',
        name: '城市之光',
        description: '照亮城市每一个角落的榜样力量',
        price: 1000,
        type: 'badge',
        icon: '/static/badges/badge_004.png',
        color: '#FF4500'
    }
]

async function handleGetProductList(data) {
    return {
        code: 200,
        rows: PRODUCTS
    }
}

async function handleRedeemProduct(data, openid) {
    const { productId } = data
    const dbCmd = db.command
    
    // 1. 查找商品
    const product = PRODUCTS.find(p => p.id === productId)
    if (!product) {
        return { code: 404, msg: '商品不存在' }
    }
    
    try {
        const transaction = await db.runTransaction(async transaction => {
            // 2. 获取用户信息 (积分, 已拥有勋章)
            const userRes = await transaction.collection('users').where({ openid }).get()
            if (userRes.data.length === 0) {
                await transaction.rollback('用户不存在')
            }
            const user = userRes.data[0]
            
            // 3. 检查是否已拥有
            if (user.badges && user.badges.includes(productId)) {
                await transaction.rollback('您已拥有该勋章')
            }
            
            // 4. 检查积分是否足够
            if ((user.points || 0) < product.price) {
                await transaction.rollback('积分不足')
            }
            
            // 5. 扣除积分并添加勋章
            await transaction.collection('users').doc(user._id).update({
                data: {
                    points: dbCmd.inc(-product.price),
                    badges: dbCmd.push(productId)
                }
            })
            
            // 6. 记录兑换日志 (可选)
            await transaction.collection('redemptions').add({
                data: {
                    openid,
                    productId,
                    productName: product.name,
                    price: product.price,
                    createTime: new Date()
                }
            })
            
            return {
                pointsLeft: (user.points || 0) - product.price
            }
        })
        
        return { code: 200, msg: '兑换成功', data: transaction }
        
    } catch (e) {
        console.error('Redeem failed:', e)
        return { code: 500, msg: e.message || '兑换失败' }
    }
}