<template>
  <view class="container map-page">
    <!-- 省份筛选条 + 附近开关 -->
    <view class="filter-bar">
      <scroll-view scroll-x class="province-scroll" :show-scrollbar="false">
        <view class="province-inner">
          <view
            class="province-chip"
            :class="{ active: currentProvince === '' }"
            @click="selectProvince('')"
          >
            <text class="chip-name">全部</text>
            <text class="chip-count">{{ collectedTotal }}/{{ spots.length }}</text>
          </view>
          <view
            class="province-chip"
            v-for="p in provinces"
            :key="p.province"
            :class="{ active: currentProvince === p.province }"
            @click="selectProvince(p.province)"
          >
            <text class="chip-name">{{ p.province }}</text>
            <text class="chip-count">{{ p.collected }}/{{ p.total }}</text>
          </view>
        </view>
      </scroll-view>
      <view class="nearby-btn" :class="{ on: nearbyOnly }" @click="toggleNearby">
        <text class="nearby-icon">📍</text>
        <text>附近</text>
      </view>
    </view>

    <map
      id="map"
      class="map-view"
      :latitude="locationStore.latitude"
      :longitude="locationStore.longitude"
      :markers="markers"
      :scale="mapScale"
      show-location
      @markertap="handleMarkerTap"
    ></map>

    <!-- 定位失败提示条 -->
    <view class="location-fail-bar" v-if="locationFailed" @click="retryLocation">
      <text class="fail-icon">⚠</text>
      <text>定位失败，点击重试</text>
    </view>

    <!-- 空状态卡片 -->
    <view class="empty-card" v-if="loaded && filteredSpots.length === 0 && showEmptyCard">
      <text class="empty-close" @click="closeEmptyCard">×</text>
      <text class="empty-title">{{ nearbyOnly ? '附近暂无打卡点' : '该省份暂无打卡点' }}</text>
      <text class="empty-desc">{{ nearbyOnly ? '试试切换省份，或去远方探索' : '去其他省份看看，或成为第一个发现者' }}</text>
      <button class="empty-btn" hover-class="btn-hover" @click="goToReport">去打卡集章</button>
    </view>

    <!-- 定位按钮 -->
    <view class="reset-location" @click="resetLocation">
      <image class="icon" src="/static/images/dingwei.png"></image>
    </view>

    <!-- 打卡点详情弹窗 -->
    <view class="marker-popup" v-if="currentSpot" @click.stop>
      <view class="popup-content">
        <view class="popup-header">
          <text class="popup-category">{{ getCategoryLabel(currentSpot.category) }}</text>
          <text class="close-btn" @click="closePopup">×</text>
        </view>
        <view class="popup-title">{{ currentSpot.name }}</view>
        <view class="popup-sub">{{ currentSpot.province }} · {{ currentSpot.city }}</view>
        <view class="popup-desc">{{ currentSpot.intro || '暂无介绍' }}</view>
        <view class="popup-stats">
          <text class="stat">{{ currentSpot.checkinCount || 0 }} 人已打卡</text>
          <text class="stat checked" v-if="currentSpot.checkedIn">✓ 已收集</text>
        </view>
        <view class="popup-footer">
          <button
            class="checkin-btn"
            hover-class="btn-hover"
            :disabled="currentSpot.checkedIn"
            :class="{ done: currentSpot.checkedIn }"
            @click="goCheckin(currentSpot)"
          >{{ currentSpot.checkedIn ? '印章已点亮' : '去打卡集章' }}</button>
        </view>
      </view>
    </view>

    <view class="action-area">
      <view class="collect-info" v-if="userStore.isLoggedIn">
        <text class="collect-num">{{ collectedTotal }}</text>
        <text class="collect-text">/ {{ spots.length }} 枚印章已收集，集齐省级系列可解锁徽章</text>
      </view>
      <view class="collect-info" v-else>
        <text class="collect-text">登录后开始收集属于你的城市印章</text>
      </view>
      <button class="scoop-btn" hover-class="btn-hover" @click="goToReport">
        <text class="btn-text">去打卡</text>
        <text class="btn-sub">发现地标 点亮印章</text>
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { useLocationStore } from '@/store/modules/location'
import { useUserStore } from '@/store/modules/user'
import { listSpots, listProvinces } from '@/api/spot'

const locationStore = useLocationStore()
const userStore = useUserStore()

const spots = ref([])          // 全部有效打卡点
const provinces = ref([])      // 省份进度
const currentProvince = ref('')
const nearbyOnly = ref(false)
const markers = ref([])
const currentSpot = ref(null)
const loaded = ref(false)
const locationFailed = ref(false)
const showEmptyCard = ref(true)

// 根据当前筛选条件得到展示列表
const filteredSpots = computed(() => {
  let list = spots.value
  if (currentProvince.value) {
    list = list.filter(s => s.province === currentProvince.value)
  }
  if (nearbyOnly.value) {
    const lat = locationStore.latitude
    const lng = locationStore.longitude
    if (lat && lng) {
      list = list.filter(s => haversineKm(lat, lng, s.lat, s.lng) <= 50)
    }
  }
  return list
})

const mapScale = computed(() => {
  if (nearbyOnly.value) return 15
  if (currentProvince.value) return 10
  return 5
})

const collectedTotal = computed(() => {
  return spots.value.filter(s => s.checkedIn).length
})

onMounted(async () => {
  try {
    await locationStore.updateLocation()
  } catch (e) {
    console.error('Location error:', e)
  }
  locationFailed.value = !!locationStore.error

  try {
    // 拉取全部打卡点（limit 500 覆盖种子数据）
    const res = await listSpots({ limit: 500 })
    if (res.code === 200) {
      spots.value = res.rows || []
    }
    const provRes = await listProvinces()
    if (provRes.code === 200) {
      provinces.value = provRes.rows || []
    }
  } catch (e) {
    console.error('Fetch spots failed:', e)
  }

  buildMarkers()
  loaded.value = true
})

// 将展示列表转成地图 markers
const buildMarkers = () => {
  markers.value = filteredSpots.value.map(item => {
    const numId = hashString(item.code || item._id)
    return {
      id: numId,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lng),
      iconPath: item.checkedIn ? '/static/tabbar/report_active.png' : '/static/tabbar/report.png',
      width: 26,
      height: 26,
      originalData: item
    }
  }).filter(m => {
    return !isNaN(m.latitude) && !isNaN(m.longitude) &&
      m.latitude >= -90 && m.latitude <= 90 &&
      m.longitude >= -180 && m.longitude <= 180
  })
}

// 字符串转数字 id（map 组件要求 number）
const hashString = (str) => {
  let num = 0
  if (!str) return 1
  for (let i = 0; i < str.length; i++) {
    num = ((num << 5) - num) + str.charCodeAt(i)
    num |= 0
  }
  return Math.abs(num) || 1
}

const selectProvince = (province) => {
  currentProvince.value = province
  buildMarkers()
}

const toggleNearby = () => {
  nearbyOnly.value = !nearbyOnly.value
  if (nearbyOnly.value && !locationStore.latitude) {
    locationStore.updateLocation()
  }
  buildMarkers()
}

const handleMarkerTap = (e) => {
  const markerId = e.detail.markerId
  const marker = markers.value.find(m => m.id === markerId)
  if (marker) {
    currentSpot.value = marker.originalData
  }
}

const closePopup = () => {
  currentSpot.value = null
}

const goCheckin = (spot) => {
  currentSpot.value = null
  uni.navigateTo({
    url: '/pages/report/report?spotCode=' + spot.code
  })
}

const goToReport = () => {
  uni.navigateTo({
    url: '/pages/report/report' + (currentSpot.value ? '?spotCode=' + currentSpot.value.code : '')
  })
}

const getCategoryLabel = (category) => {
  const map = { '自然': '自然风光', '人文': '人文古迹', '街区': '特色街区', '地标': '城市地标' }
  return map[category] || category || '打卡点'
}

const closeEmptyCard = () => {
  showEmptyCard.value = false
}

const retryLocation = async () => {
  try {
    await locationStore.updateLocation()
    locationFailed.value = false
    if (nearbyOnly.value) buildMarkers()
  } catch (e) {
    console.error('Retry location failed:', e)
  }
}

const resetLocation = () => {
  const mapCtx = uni.createMapContext('map')
  mapCtx.moveToLocation()
  locationStore.updateLocation()
}

// 球面距离（公里）
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const rad = d => d * Math.PI / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

onShareAppMessage((res) => {
  return {
    title: '城市印章 - 打卡城市地标，集齐专属印章',
    path: '/pages/index/index',
    imageUrl: '/static/logo.png'
  }
})

onShareTimeline((res) => {
  return {
    title: '城市印章 - 打卡城市地标，集齐专属印章',
    query: ''
  }
})
</script>

<style lang="scss">
.map-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  // #ifdef H5
  height: calc(100vh - 50px);
  // #endif
  padding: 0;
  overflow: hidden;
  background: #f5f5f5;
}

// 顶部筛选条
.filter-bar {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 12rpx 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  z-index: 100;

  .province-scroll {
    flex: 1;
    white-space: nowrap;

    .province-inner {
      display: inline-flex;
      padding-right: 20rpx;
    }
  }

  .province-chip {
    display: inline-flex;
    align-items: baseline;
    padding: 10rpx 24rpx;
    margin-right: 16rpx;
    border-radius: 32rpx;
    background: #f2f3f5;
    font-size: 26rpx;
    color: #666;

    &.active {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
    }

    .chip-count {
      font-size: 20rpx;
      margin-left: 6rpx;
      opacity: 0.75;
    }
  }

  .nearby-btn {
    display: flex;
    align-items: center;
    padding: 10rpx 20rpx;
    border-radius: 32rpx;
    background: #f2f3f5;
    font-size: 26rpx;
    color: #666;
    flex-shrink: 0;

    .nearby-icon {
      margin-right: 4rpx;
    }

    &.on {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
    }
  }
}

.map-view {
  flex: 1;
  width: 100%;
  position: relative;
}

.location-fail-bar {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 10px 24px;
  font-size: 14px;
  color: #e74c3c;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 90;
  white-space: nowrap;

  .fail-icon {
    margin-right: 6px;
  }
}

.empty-card {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 260px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 16px;
  padding: 28px 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  z-index: 80;

  .empty-close {
    position: absolute;
    top: 6px;
    right: 12px;
    font-size: 24px;
    color: #999;
    line-height: 1;
    padding: 0 4px;
  }

  .empty-title {
    font-size: 17px;
    font-weight: bold;
    color: #333;
    margin-bottom: 8px;
  }

  .empty-desc {
    font-size: 13px;
    color: #999;
    margin-bottom: 20px;
    text-align: center;
  }

  .empty-btn {
    height: 40px;
    line-height: 40px;
    padding: 0 30px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #fff;
    font-size: 14px;
    border-radius: 20px;
    box-shadow: 0 4px 10px rgba(102, 126, 234, 0.4);

    &::after {
      border: none;
    }
  }
}

.reset-location {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  right: 20px;
  width: 40px;
  height: 40px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 99;

  .icon {
    width: 28px;
    height: 28px;
  }
}

.action-area {
  background: #fff;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: 16px 20px 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 10;
  margin-top: -20px;

  .collect-info {
    display: flex;
    align-items: baseline;
    margin-bottom: 14px;
    font-size: 12px;
    color: #999;

    .collect-num {
      font-size: 20px;
      font-weight: bold;
      color: #667eea;
      margin-right: 4px;
    }
  }

  .scoop-btn {
    width: 150px;
    height: 150px;
    border-radius: 50%;
    background: linear-gradient(135deg, $uni-color-primary, $uni-color-success);
    color: #fff;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    box-shadow: 0 5px 15px rgba(60, 197, 31, 0.4);
    border: 5px solid rgba(255, 255, 255, 0.3);

    &.btn-hover {
      transform: scale(0.95);
      opacity: 0.9;
    }

    .btn-text {
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .btn-sub {
      font-size: 11px;
      opacity: 0.9;
    }
  }
}

.marker-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;

  .popup-content {
    width: 80%;
    background: #fff;
    border-radius: 16px;
    padding: 20px;

    .popup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      .popup-category {
        font-size: 12px;
        color: #667eea;
        background: rgba(102, 126, 234, 0.1);
        padding: 4rpx 16rpx;
        border-radius: 20rpx;
      }

      .close-btn {
        font-size: 24px;
        color: #999;
        line-height: 1;
        padding: 0 5px;
      }
    }

    .popup-title {
      font-size: 20px;
      font-weight: bold;
      color: #333;
      margin-bottom: 6px;
    }

    .popup-sub {
      font-size: 13px;
      color: #999;
      margin-bottom: 10px;
    }

    .popup-desc {
      font-size: 14px;
      color: #555;
      line-height: 1.6;
      margin-bottom: 12px;
    }

    .popup-stats {
      display: flex;
      align-items: center;
      margin-bottom: 14px;

      .stat {
        font-size: 12px;
        color: #999;
        margin-right: 16px;

        &.checked {
          color: #4caf50;
          font-weight: bold;
        }
      }
    }

    .popup-footer {
      .checkin-btn {
        height: 40px;
        line-height: 40px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: #fff;
        font-size: 15px;
        border-radius: 20px;

        &::after {
          border: none;
        }

        &.done {
          background: #e0e0e0;
          color: #999;
        }
      }
    }
  }
}
</style>
