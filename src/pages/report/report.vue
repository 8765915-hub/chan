<template>
  <view class="container">
    <!-- 头部背景 -->
    <view class="header-bg">
      <view class="bg-circle c1"></view>
      <view class="bg-circle c2"></view>
    </view>

    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">打卡集章</text>
      <text class="page-subtitle">到点拍照，点亮专属印章</text>
    </view>

    <!-- 选择打卡点 -->
    <view class="form-card">
      <view class="card-label">
        <view class="label-dot"></view>
        <text class="label-text">选择打卡点</text>
        <text class="label-hint" v-if="selectedSpot">点击可更换</text>
      </view>

      <!-- 已选打卡点 -->
      <view class="selected-spot" v-if="selectedSpot" @click="selectedSpot = null">
        <view class="spot-main">
          <text class="spot-name">{{ selectedSpot.name }}</text>
          <text class="spot-sub">{{ selectedSpot.province }} · {{ selectedSpot.city }} · {{ getCategoryLabel(selectedSpot.category) }}</text>
          <text class="spot-intro">{{ selectedSpot.intro }}</text>
        </view>
        <view class="spot-checked" v-if="selectedSpot.checkedIn">
          <text>✓ 已收集</text>
        </view>
        <view class="spot-change" v-else>更换</view>
      </view>

      <!-- 打卡点选择列表 -->
      <view v-else>
        <view class="search-box">
          <input
            class="search-input"
            v-model="keyword"
            placeholder="搜索打卡点名称或城市"
            confirm-type="search"
          />
        </view>
        <scroll-view scroll-x class="province-scroll" :show-scrollbar="false">
          <view class="province-inner">
            <view
              class="province-chip"
              :class="{ active: spotProvince === '' }"
              @click="spotProvince = ''"
            >全部</view>
            <view
              class="province-chip"
              v-for="p in provinces"
              :key="p.province"
              :class="{ active: spotProvince === p.province }"
              @click="spotProvince = p.province"
            >{{ p.province }}</view>
          </view>
        </scroll-view>
        <scroll-view scroll-y class="spot-list">
          <view
            class="spot-item"
            v-for="s in filteredSpots"
            :key="s.code"
            @click="pickSpot(s)"
          >
            <view class="spot-item-main">
              <text class="spot-item-name">{{ s.name }}</text>
              <text class="spot-item-sub">{{ s.city }} · {{ getCategoryLabel(s.category) }}</text>
            </view>
            <view class="spot-item-side">
              <text class="spot-count">{{ s.checkinCount || 0 }}人</text>
              <text class="spot-state" :class="{ done: s.checkedIn }">{{ s.checkedIn ? '已收集' : '未收集' }}</text>
            </view>
          </view>
          <view class="spot-empty" v-if="filteredSpots.length === 0">
            <text>没有找到匹配的打卡点</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 打卡模式 -->
    <view class="form-card" v-if="selectedSpot">
      <view class="card-label">
        <view class="label-dot"></view>
        <text class="label-text">打卡模式</text>
      </view>
      <view class="mode-list">
        <view
          class="mode-option"
          :class="{ active: mode === 'onSite' }"
          @click="mode = 'onSite'"
        >
          <text class="mode-icon">📍</text>
          <view class="mode-info">
            <text class="mode-name">实地打卡</text>
            <text class="mode-desc">到现场拍照，+{{ modePoints.onSite }}分</text>
          </view>
          <text class="mode-radio" :class="{ on: mode === 'onSite' }"></text>
        </view>
        <view class="mode-option" :class="{ active: mode === 'memory' }" @click="mode = 'memory'">
          <text class="mode-icon">📷</text>
          <view class="mode-info">
            <text class="mode-name">回忆打卡</text>
            <text class="mode-desc">之前去过，补打卡，+{{ modePoints.memory }}分</text>
          </view>
          <text class="mode-radio" :class="{ on: mode === 'memory' }"></text>
        </view>
        <view class="mode-option" :class="{ active: mode === 'cloud' }" @click="mode = 'cloud'">
          <text class="mode-icon">☁️</text>
          <view class="mode-info">
            <text class="mode-name">云打卡</text>
            <text class="mode-desc">云游集章，无需到现场，+{{ modePoints.cloud }}分</text>
          </view>
          <text class="mode-radio" :class="{ on: mode === 'cloud' }"></text>
        </view>
      </view>

      <!-- 实地打卡距离提示 -->
      <view class="distance-tip" v-if="mode === 'onSite' && locationStore.latitude">
        <text>当前距「{{ selectedSpot.name }}」约 {{ distanceText }}</text>
      </view>
      <view class="distance-tip" v-else-if="mode === 'onSite'">
        <text>请开启定位，实地打卡需在打卡点 {{ checkinRadiusKm }}km 范围内</text>
      </view>
    </view>

    <!-- 媒体上传 -->
    <view class="form-card" v-if="selectedSpot">
      <view class="card-label">
        <view class="label-dot"></view>
        <text class="label-text">上传照片</text>
        <text class="label-hint" v-if="mode !== 'cloud'">至少1张，最多3张</text>
        <text class="label-hint" v-else>云打卡可不传照片</text>
      </view>
      <view class="media-grid">
        <view class="media-item" v-for="(item, index) in mediaList" :key="index">
          <image v-if="item.type === 'image'" :src="item.path" mode="aspectFill" @click="previewMedia(index)"></image>
          <video v-else :src="item.path" class="video-preview"></video>
          <view class="delete-btn" @click.stop="deleteMedia(index)">
            <view class="delete-icon"></view>
          </view>
        </view>
        <view class="add-media" v-if="mediaList.length < 3" @click="chooseMedia">
          <view class="add-icon">+</view>
          <text class="add-text">添加</text>
        </view>
      </view>
    </view>

    <!-- 描述说明 -->
    <view class="form-card" v-if="selectedSpot">
      <view class="card-label">
        <view class="label-dot"></view>
        <text class="label-text">描述说明</text>
        <text class="label-hint">选填</text>
      </view>
      <textarea
        v-model="description"
        placeholder="说说这里的故事或此刻的心情..."
        class="desc-textarea"
        :maxlength="200"
      />
      <view class="char-count">{{ description.length }}/200</view>
    </view>

    <!-- 提交按钮 -->
    <view class="submit-wrap" v-if="selectedSpot">
      <button
        class="submit-btn"
        :loading="submitting"
        :disabled="submitting || !canSubmit"
        @click="submitCheckin"
      >
        <text v-if="!submitting">{{ selectedSpot.checkedIn ? '印章已收集' : '点亮印章' }}</text>
        <text v-else>提交中...</text>
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useLocationStore } from '@/store/modules/location'
import { useUserStore } from '@/store/modules/user'
import { listSpots, listProvinces, checkinSpot, getSpotDetail } from '@/api/spot'
import { uploadFile } from '@/utils/request'
import { MODE_POINTS } from '@/utils/series'

// 实地打卡距离提示（与服务端校验半径保持一致）
const checkinRadiusKm = ref(1.5)
// 打卡模式积分（模板中通过 ref 访问，避免编译期常量内联问题）
const modePoints = ref(MODE_POINTS)

const locationStore = useLocationStore()
const userStore = useUserStore()

const spots = ref([])
const provinces = ref([])
const keyword = ref('')
const spotProvince = ref('')
const selectedSpot = ref(null)
const mode = ref('onSite')
const mediaList = ref([])
const description = ref('')
const submitting = ref(false)

// 距离计算
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const rad = d => d * Math.PI / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const distanceText = computed(() => {
  if (!selectedSpot.value || !locationStore.latitude) return ''
  const dist = haversineKm(locationStore.latitude, locationStore.longitude, selectedSpot.value.lat, selectedSpot.value.lng)
  if (dist < 1) return Math.round(dist * 1000) + 'm'
  return dist.toFixed(1) + 'km'
})

const canSubmit = computed(() => {
  if (!selectedSpot.value || selectedSpot.value.checkedIn) return false
  if (mode.value !== 'cloud' && mediaList.value.length === 0) return false
  return true
})

const filteredSpots = computed(() => {
  let list = spots.value
  if (spotProvince.value) list = list.filter(s => s.province === spotProvince.value)
  if (keyword.value.trim()) {
    const kw = keyword.value.trim()
    list = list.filter(s => s.name.includes(kw) || s.city.includes(kw) || s.province.includes(kw))
  }
  return list
})

onLoad(async (query) => {
  locationStore.updateLocation()
  await loadSpots()
  if (query && query.spotCode) {
    await preselectSpot(query.spotCode)
  }
})

const loadSpots = async () => {
  try {
    const res = await listSpots({ limit: 500 })
    if (res.code === 200) {
      spots.value = res.rows || []
    }
    const provRes = await listProvinces()
    if (provRes.code === 200) {
      provinces.value = provRes.rows || []
    }
  } catch (e) {
    console.error('Load spots failed:', e)
  }
}

const preselectSpot = async (code) => {
  // 从已加载列表里找
  const found = spots.value.find(s => s.code === code)
  if (found) {
    selectedSpot.value = found
    return
  }
  try {
    const res = await getSpotDetail(code)
    if (res.code === 200) selectedSpot.value = res.data
  } catch (e) {
    console.error('Preselect spot failed:', e)
  }
}

const pickSpot = (spot) => {
  selectedSpot.value = spot
  // 已收集则自动切到回忆/云模式无效，直接提示
  if (spot.checkedIn) {
    uni.showToast({ title: '该印章已收集，去集齐下一个吧', icon: 'none' })
  }
}

const getCategoryLabel = (category) => {
  const map = { '自然': '自然风光', '人文': '人文古迹', '街区': '特色街区', '地标': '城市地标' }
  return map[category] || category || '打卡点'
}

const chooseMedia = () => {
  uni.chooseMedia({
    count: 3 - mediaList.value.length,
    mediaType: ['image', 'video'],
    sourceType: ['album', 'camera'],
    maxDuration: 60,
    camera: 'back',
    success: (res) => {
      const newFiles = res.tempFiles.map(file => ({
        type: file.fileType || (file.tempFilePath.endsWith('.mp4') ? 'video' : 'image'),
        path: file.tempFilePath
      }))
      mediaList.value = [...mediaList.value, ...newFiles]
    }
  })
}

const deleteMedia = (index) => {
  mediaList.value.splice(index, 1)
}

const previewMedia = (index) => {
  const item = mediaList.value[index]
  if (item.type === 'image') {
    const images = mediaList.value.filter(m => m.type === 'image').map(m => m.path)
    uni.previewImage({ urls: images, current: item.path })
  }
}

const submitCheckin = async () => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login?from=report' })
    return
  }
  if (!selectedSpot.value) {
    uni.showToast({ title: '请先选择打卡点', icon: 'none' })
    return
  }
  if (selectedSpot.value.checkedIn) {
    uni.showToast({ title: '该印章已收集', icon: 'none' })
    return
  }
  if (mode.value !== 'cloud' && mediaList.value.length === 0) {
    uni.showToast({ title: '请上传至少1张照片', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const uploadedFiles = []
    for (const item of mediaList.value) {
      try {
        let filePath = item.path
        if (item.type === 'image') {
          // 压缩到 1MB 以内，既省云存储空间，也满足 imgSecCheck ≤1MB 限制
          const fs = uni.getFileSystemManager()
          const fileInfo = await new Promise((resolve, reject) => {
            fs.getFileInfo({ filePath, success: resolve, fail: reject })
          })
          if (fileInfo.size > 1024 * 1024) {
            const compressRes = await new Promise((resolve, reject) => {
              uni.compressImage({ src: filePath, quality: 60, success: resolve, fail: reject })
            })
            filePath = compressRes.tempFilePath
          }
        }
        // 先上传拿到 fileID，再用 fileID 走云函数审核（避免 base64 触发 callFunction 的 data 大小上限）
        const { url, fileID } = await uploadFile(filePath)
        if (item.type === 'image') {
          const checkRes = await wx.cloud.callFunction({
            name: 'checkContent',
            data: { type: 'image', content: fileID }
          })
          if (checkRes.result.code !== 200) {
            // 审核不通过，清理已上传的文件
            wx.cloud.deleteFile({ fileList: [fileID] })
            uni.showToast({ title: '图片包含违规内容', icon: 'none' })
            submitting.value = false
            return
          }
        }
        uploadedFiles.push({ type: item.type, url })
      } catch (e) {
        console.error('Upload or check failed', e)
        uni.showToast({ title: '文件上传失败', icon: 'none' })
        submitting.value = false
        return
      }
    }

    if (description.value) {
      try {
        const checkRes = await wx.cloud.callFunction({
          name: 'checkContent',
          data: { type: 'text', content: description.value }
        })
        if (checkRes.result.code !== 200) {
          uni.showToast({ title: '描述包含违规内容', icon: 'none' })
          submitting.value = false
          return
        }
      } catch (e) {
        uni.showToast({ title: '文本审核失败', icon: 'none' })
        submitting.value = false
        return
      }
    }

    const checkinData = {
      spotCode: selectedSpot.value.code,
      mode: mode.value,
      description: description.value,
      media: uploadedFiles,
      images: uploadedFiles.filter(f => f.type === 'image').map(f => f.url).join(','),
      latitude: locationStore.latitude,
      longitude: locationStore.longitude,
      address: locationStore.address
    }

    const res = await checkinSpot(checkinData)
    if (res.code === 200) {
      userStore.addPoints(res.data.awardedPoints || 0)
      userStore.getUserInfo() // 后台刷新印章数据
      const firstImage = uploadedFiles.find(f => f.type === 'image')
      uni.showModal({
        title: '打卡成功',
        content: `「${selectedSpot.value.name}」印章已点亮，获得 ${res.data.awardedPoints} 积分。继续集齐同省印章，解锁系列徽章！`,
        confirmText: '生成海报',
        cancelText: '返回',
        success: (modalRes) => {
          if (modalRes.confirm) {
            uni.navigateTo({
              url: '/pages/share/poster'
                + '?image=' + encodeURIComponent(firstImage ? firstImage.url : '')
                + '&spotName=' + encodeURIComponent(selectedSpot.value.name)
                + '&sub=' + encodeURIComponent(selectedSpot.value.province + '·' + selectedSpot.value.city)
                + '&date=' + encodeURIComponent(new Date().toLocaleDateString())
            })
          } else {
            uni.navigateBack()
          }
        }
      })
      mediaList.value = []
      description.value = ''
    } else {
      uni.showToast({ title: res.msg || '打卡失败', icon: 'none' })
    }
  } catch (e) {
    console.error('Checkin failed', e)
    uni.showToast({ title: '打卡失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss">
page {
  background: #f5f6fa;
}

.container {
  min-height: 100vh;
  padding: 0 0 40px;
}

.header-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 180px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: 0;

  .bg-circle {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);

    &.c1 {
      width: 200px;
      height: 200px;
      top: -80px;
      right: -60px;
    }

    &.c2 {
      width: 120px;
      height: 120px;
      bottom: 30px;
      left: -40px;
    }
  }
}

.page-header {
  position: relative;
  z-index: 1;
  padding: 40px 20px 20px;
  text-align: center;

  .page-title {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    display: block;
    margin-bottom: 6px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .page-subtitle {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.8);
  }
}

.form-card {
  position: relative;
  z-index: 1;
  background: #fff;
  border-radius: 16px;
  margin: 0 16px 12px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.card-label {
  display: flex;
  align-items: center;
  margin-bottom: 12px;

  .label-dot {
    width: 4px;
    height: 16px;
    background: linear-gradient(180deg, #667eea, #764ba2);
    border-radius: 2px;
    margin-right: 8px;
  }

  .label-text {
    font-size: 15px;
    font-weight: 600;
    color: #333;
  }

  .label-hint {
    font-size: 12px;
    color: #999;
    margin-left: 8px;
  }
}

// 已选打卡点
.selected-spot {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 14px 16px;

  .spot-main {
    flex: 1;
    min-width: 0;

    .spot-name {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      display: block;
      margin-bottom: 4px;
    }

    .spot-sub {
      font-size: 12px;
      color: #999;
      display: block;
      margin-bottom: 4px;
    }

    .spot-intro {
      font-size: 12px;
      color: #888;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }

  .spot-checked {
    font-size: 12px;
    color: #4caf50;
    font-weight: bold;
    margin-left: 10px;
  }

  .spot-change {
    font-size: 12px;
    color: #667eea;
    margin-left: 10px;
    flex-shrink: 0;
  }
}

// 搜索
.search-box {
  margin-bottom: 12px;

  .search-input {
    height: 40px;
    background: #f8f9fa;
    border-radius: 20px;
    padding: 0 20px;
    font-size: 14px;
    color: #333;
  }
}

// 省份筛选
.province-scroll {
  white-space: nowrap;
  margin-bottom: 12px;

  .province-inner {
    display: inline-flex;
    padding-right: 10px;
  }
}

.province-chip {
  display: inline-flex;
  padding: 8rpx 22rpx;
  margin-right: 12rpx;
  border-radius: 30rpx;
  background: #f2f3f5;
  font-size: 24rpx;
  color: #666;

  &.active {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #fff;
  }
}

// 打卡点列表
.spot-list {
  max-height: 360px;
  border-radius: 12px;

  .spot-item {
    display: flex;
    align-items: center;
    padding: 14px 12px;
    border-bottom: 1px solid #f5f5f5;

    &:active {
      background: #f8f9fa;
    }

    .spot-item-main {
      flex: 1;
      min-width: 0;

      .spot-item-name {
        font-size: 15px;
        font-weight: 500;
        color: #333;
        display: block;
        margin-bottom: 4px;
      }

      .spot-item-sub {
        font-size: 12px;
        color: #999;
      }
    }

    .spot-item-side {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-left: 10px;

      .spot-count {
        font-size: 11px;
        color: #bbb;
        margin-bottom: 4px;
      }

      .spot-state {
        font-size: 11px;
        color: #667eea;
        background: rgba(102, 126, 234, 0.1);
        padding: 4rpx 14rpx;
        border-radius: 20rpx;

        &.done {
          color: #4caf50;
          background: rgba(76, 175, 80, 0.1);
        }
      }
    }
  }

  .spot-empty {
    padding: 30px 0;
    text-align: center;
    font-size: 13px;
    color: #999;
  }
}

// 打卡模式
.mode-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mode-option {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 2px solid transparent;

  &.active {
    background: #fff;
    border-color: #667eea;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  }

  .mode-icon {
    font-size: 26px;
    margin-right: 12px;
  }

  .mode-info {
    flex: 1;

    .mode-name {
      font-size: 15px;
      font-weight: 600;
      color: #333;
      display: block;
      margin-bottom: 3px;
    }

    .mode-desc {
      font-size: 12px;
      color: #999;
    }
  }

  .mode-radio {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid #ccc;
    position: relative;

    &.on {
      border-color: #667eea;

      &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #667eea;
      }
    }
  }
}

.distance-tip {
  margin-top: 12px;
  font-size: 12px;
  color: #999;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 10px 12px;
}

// 媒体上传
.media-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  .media-item {
    position: relative;
    width: calc((100% - 20px) / 3);
    aspect-ratio: 1;
    border-radius: 12px;
    overflow: hidden;
    background: #f0f0f0;

    image,
    .video-preview {
      width: 100%;
      height: 100%;
    }

    .delete-btn {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 22px;
      height: 22px;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;

      .delete-icon {
        width: 12px;
        height: 2px;
        background: #fff;
        border-radius: 1px;
      }
    }
  }

  .add-media {
    width: calc((100% - 20px) / 3);
    aspect-ratio: 1;
    background: #f8f9fa;
    border: 2px dashed #ddd;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    &:active {
      background: #f0f0f0;
    }

    .add-icon {
      font-size: 32px;
      color: #ccc;
      line-height: 1;
      margin-bottom: 4px;
    }

    .add-text {
      font-size: 12px;
      color: #999;
    }
  }
}

// 描述输入
.desc-textarea {
  width: 100%;
  height: 100px;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  color: #333;
  box-sizing: border-box;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

// 提交按钮
.submit-wrap {
  padding: 20px 16px 30px;
}

.submit-btn {
  width: 100%;
  height: 48px;
  line-height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: #fff !important;
  font-size: 16px;
  font-weight: 600;
  border-radius: 24px;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
  border: none;

  &:active {
    transform: scale(0.98);
  }

  &[disabled] {
    background: #ccc !important;
    box-shadow: none;
  }

  &::after {
    border: none !important;
  }
}
</style>
