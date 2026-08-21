import { request } from '@/utils/request'

// 打卡点列表：province/city/category/lat/lng/radius/limit/offset
export function listSpots(query) {
  return request({
    url: '/spots/list',
    method: 'GET',
    data: query || {},
    hideLoading: true
  })
}

// 打卡点详情
export function getSpotDetail(code) {
  return request({
    url: '/spots/detail',
    method: 'GET',
    data: { code },
    hideLoading: true
  })
}

// 省份列表与收集进度
export function listProvinces() {
  return request({
    url: '/spots/provinces',
    method: 'GET',
    data: {},
    hideLoading: true
  })
}

// 打卡：mode = onSite | memory | cloud
export function checkinSpot(data) {
  return request({
    url: '/spots/checkin',
    method: 'POST',
    data: data
  })
}

// 我的印章：收集记录 + 系列进度
export function getMyStamps() {
  return request({
    url: '/spots/my',
    method: 'GET',
    data: {},
    hideLoading: true
  })
}

// 本周集章榜
export function getStampsRank() {
  return request({
    url: '/system/user/rank/stamps-week',
    method: 'GET',
    data: {},
    hideLoading: true
  })
}
