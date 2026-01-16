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
          isHighAccuracy: true,
          geocode: true,
          success: (res) => {
            this.latitude = res.latitude;
            this.longitude = res.longitude;
            this.error = null;
            
            // 天地图逆地理编码
            const key = '6e74d6866fd30517a988e35b5a494a2c';
            const postStr = JSON.stringify({
              lon: res.longitude,
              lat: res.latitude,
              ver: 1
            });
            
            uni.request({
              url: 'https://api.tianditu.gov.cn/geocoder',
              method: 'GET',
              data: {
                postStr: postStr,
                type: 'geocode',
                tk: key
              },
              success: (geoRes) => {
                if (geoRes.data && geoRes.data.result && geoRes.data.result.formatted_address) {
                  this.address = geoRes.data.result.formatted_address;
                } else {
                  this.address = `Lat: ${res.latitude.toFixed(4)}, Lng: ${res.longitude.toFixed(4)}`;
                }
                resolve(res);
              },
              fail: (err) => {
                console.error('Tianditu geocoding failed', err);
                this.address = `Lat: ${res.latitude.toFixed(4)}, Lng: ${res.longitude.toFixed(4)}`;
                resolve(res);
              }
            });
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
