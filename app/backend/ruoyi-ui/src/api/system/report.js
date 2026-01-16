import request from '@/utils/request'

// 查询上报记录列表
export function listReport(query) {
  return request({
    url: '/system/report/list',
    method: 'get',
    params: query
  })
}

// 查询上报记录详细
export function getReport(id) {
  return request({
    url: '/system/report/' + id,
    method: 'get'
  })
}

// 新增上报记录
export function addReport(data) {
  return request({
    url: '/system/report',
    method: 'post',
    data: data
  })
}

// 修改上报记录
export function updateReport(data) {
  return request({
    url: '/system/report',
    method: 'put',
    data: data
  })
}

// 删除上报记录
export function delReport(id) {
  return request({
    url: '/system/report/' + id,
    method: 'delete'
  })
}
