import { defineStore } from 'pinia'

export const useLocationStore = defineStore('location', {
  state: () => ({
    latitude: 0,
    longitude: 0,
    address: '定位中...',
    error: null
  }),
  actions: {
    updateLocation() {
      return new Promise((resolve, reject) => {
        uni.getLocation({
          type: 'wgs84',
          success: (res) => {
            this.latitude = res.latitude;
            this.longitude = res.longitude;
            this.error = null;
            this.address = `Lat: ${res.latitude.toFixed(4)}, Lng: ${res.longitude.toFixed(4)}`; // Mock address
            resolve(res);
          },
          fail: (err) => {
            this.error = err.errMsg;
            this.address = '定位失败';
            reject(err);
          }
        });
      });
    }
  }
})
