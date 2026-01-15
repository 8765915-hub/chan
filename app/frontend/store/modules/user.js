import { defineStore } from 'pinia'
import { request } from '@/utils/request'

export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null,
    token: null,
    points: 0,
    reportCount: 0,
    weeklyRank: 0
  }),
  getters: {
    isLoggedIn: (state) => !!state.token
  },
  actions: {
    login(provider = 'weixin') {
      return new Promise((resolve, reject) => {
        uni.login({
          provider: 'weixin',
          success: async (loginRes) => {
            try {
              // Call backend login API
              const res = await request({ 
                url: '/wechat/login', 
                method: 'POST', 
                data: { 
                  // username/password is no longer needed for this endpoint
                  // username: 'admin', 
                  // password: 'admin123',
                  code: loginRes.code, 
                  uuid: '123456' 
                } 
              })
              
              if (res.code === 200) {
                this.token = res.token
                uni.setStorageSync('token', this.token)
                await this.getUserInfo()
                resolve(this.userInfo)
              } else {
                reject(res.msg)
              }
            } catch (e) {
              reject(e)
            }
          },
          fail: (err) => {
            reject(err)
          }
        })
      })
    },
    async getUserInfo() {
      try {
        const res = await request({ url: '/getInfo' })
        if (res.code === 200) {
          this.userInfo = res.user
          // Default points if not present
          this.points = res.user.points || 0
          this.reportCount = res.reportCount || 0
          this.weeklyRank = res.weeklyRank || 0
        }
      } catch (e) {
        console.error('Get user info failed', e)
      }
    },
    logout() {
      this.token = null
      this.userInfo = null
      uni.removeStorageSync('token')
    },
    addPoints(amount) {
      this.points += amount
    },
    updateProfile(data) {
      this.userInfo = { ...this.userInfo, ...data }
    }
  }
})
