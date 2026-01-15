<template>
  <view class="container map-page">
    <map 
      id="map" 
      class="map-view"
      :latitude="locationStore.latitude" 
      :longitude="locationStore.longitude"
      :markers="markers"
      :scale="16"
      show-location
    ></map>

    <view class="action-area">
      <view class="location-info" v-if="locationStore.address">
        <text class="uni-icon uni-icon-location"></text>
        当前位置: {{ locationStore.address }}
      </view>
      <button class="scoop-btn" hover-class="btn-hover" @click="goToReport">
        <text class="btn-text">铲一铲</text>
        <text class="btn-sub">发现便便 立即上报</text>
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useLocationStore } from '@/store/modules/location'

const locationStore = useLocationStore()

// Mock markers data
const markers = ref([
  {
    id: 1,
    latitude: 39.909,
    longitude: 116.397,
    title: '已清理',
    iconPath: '/static/tabbar/report_active.png',
    width: 30,
    height: 30
  },
  {
    id: 2,
    latitude: 39.908,
    longitude: 116.398,
    title: '待清理',
    iconPath: '/static/tabbar/report.png',
    width: 30,
    height: 30
  }
])

onMounted(async () => {
  try {
    await locationStore.updateLocation()
    // Update markers based on current location to simulate data around user
    if (locationStore.latitude && locationStore.longitude) {
      markers.value = [
        {
          id: 1,
          latitude: locationStore.latitude + 0.001,
          longitude: locationStore.longitude + 0.001,
          title: '发现便便',
          width: 30,
          height: 30,
          iconPath: '/static/tabbar/report.png'
        },
        {
          id: 2,
          latitude: locationStore.latitude - 0.001,
          longitude: locationStore.longitude - 0.0005,
          title: '已清理',
          width: 30,
          height: 30,
          iconPath: '/static/tabbar/report_active.png'
        }
      ]
    }
  } catch (e) {
    console.error('Location error:', e)
  }
})

const goToReport = () => {
  uni.navigateTo({
    url: '/pages/report/report'
  })
}
</script>

<style lang="scss">
.map-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0; // Override default container padding
  overflow: hidden;
}

.map-view {
  flex: 1;
  width: 100%;
}

.action-area {
  background: #fff;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: 20px;
  padding-bottom: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  position: relative;
  z-index: 10;
  margin-top: -20px; // Overlap map slightly
}

.location-info {
  margin-bottom: 20px;
  font-size: 14px;
  color: #666;
  display: flex;
  align-items: center;
  
  text {
    margin-right: 5px;
  }
}

.scoop-btn {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: linear-gradient(135deg, $uni-color-primary, $uni-color-success);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0 5px 15px rgba(60, 197, 31, 0.4);
  border: 5px solid rgba(255,255,255,0.3);
  
  &.btn-hover {
    transform: scale(0.95);
    opacity: 0.9;
  }
  
  .btn-text {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 5px;
  }
  
  .btn-sub {
    font-size: 12px;
    opacity: 0.9;
  }
}
</style>
