// api.js
const baseURL = 'https://chan.58w.fun/prod-api'

export const request = (options) => {
  return new Promise((resolve, reject) => {
    uni.request({
      url: baseURL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Authorization': uni.getStorageSync('token') ? 'Bearer ' + uni.getStorageSync('token') : '',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(res)
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}
