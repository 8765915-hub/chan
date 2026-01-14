import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null,
    token: null,
    points: 100 // Mock initial points
  }),
  getters: {
    isLoggedIn: (state) => !!state.token
  },
  actions: {
    login(provider = 'weixin') {
      // Mock login logic
      return new Promise((resolve) => {
        setTimeout(() => {
          this.token = 'mock-token-' + Date.now();
          this.userInfo = {
            nickName: '铲屎官No.1',
            avatarUrl: 'https://via.placeholder.com/150'
          };
          uni.setStorageSync('token', this.token);
          resolve(this.userInfo);
        }, 1000);
      });
    },
    logout() {
      this.token = null;
      this.userInfo = null;
      uni.removeStorageSync('token');
    },
    addPoints(amount) {
      this.points += amount;
    },
    updateProfile(data) {
      this.userInfo = { ...this.userInfo, ...data };
    }
  }
})
