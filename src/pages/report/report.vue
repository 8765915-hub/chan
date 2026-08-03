<template>
  <view class="container">
    <!-- 头部背景 -->
    <view class="header-bg">
      <view class="bg-circle c1"></view>
      <view class="bg-circle c2"></view>
    </view>

    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">上报打卡</text>
      <text class="page-subtitle">记录身边的美好瞬间</text>
    </view>

    <!-- 位置选择 -->
    <view class="form-card">
      <view class="card-label">
        <view class="label-dot"></view>
        <text class="label-text">打卡位置</text>
      </view>
      <view class="location-box" @click="chooseLocation">
        <view class="location-icon">
          <view class="icon-pin"></view>
        </view>
        <view class="location-info">
          <text class="location-text">{{ locationStore.address || '点击选择位置' }}</text>
        </view>
        <view class="location-arrow">›</view>
      </view>
    </view>

    <!-- 打卡类型 -->
    <view class="form-card">
      <view class="card-label">
        <view class="label-dot"></view>
        <text class="label-text">打卡类型</text>
      </view>
      <view class="type-list">
        <view 
          class="type-option" 
          v-for="(item, index) in reportTypes" 
          :key="index"
          :class="{ active: item.value === reportType }"
          @click="reportType = item.value"
        >
          <view class="type-icon" :class="item.value">
            <view class="icon-inner"></view>
          </view>
          <text class="type-name">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- 媒体上传 -->
    <view class="form-card">
      <view class="card-label">
        <view class="label-dot"></view>
        <text class="label-text">上传照片</text>
        <text class="label-hint">至少1张，最多3张</text>
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
    <view class="form-card">
      <view class="card-label">
        <view class="label-dot"></view>
        <text class="label-text">描述说明</text>
      </view>
      <textarea 
        v-model="description" 
        placeholder="请简单描述一下您发现的内容..." 
        class="desc-textarea" 
        :maxlength="200"
      />
      <view class="char-count">{{ description.length }}/200</view>
    </view>

    <!-- 提交按钮 -->
    <view class="submit-wrap">
      <button 
        class="submit-btn" 
        :loading="submitting" 
        :disabled="submitting || mediaList.length === 0"
        @click="submitReport"
      >
        <text v-if="!submitting">立即打卡</text>
        <text v-else>提交中...</text>
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onLoad, onHide } from '@dcloudio/uni-app'
import { useLocationStore } from '@/store/modules/location'
import { useUserStore } from '@/store/modules/user'
import { addReport } from '@/api/report'
import { uploadFile } from '@/utils/request'
import { SUBSCRIBE_TEMPLATE_ID } from '@/config'

// 草稿本地存储 key
const DRAFT_KEY = 'report_draft'
// 各打卡类型对应的积分奖励
const REPORT_POINTS = { beauty: 10, behavior: 15, public: 20 }

const locationStore = useLocationStore()
const userStore = useUserStore()

const mediaList = ref([])
const description = ref('')
const submitting = ref(false)
const reportType = ref('beauty')

const reportTypes = [
  { label: '城市美景', value: 'beauty' },
  { label: '文明行为', value: 'behavior' },
  { label: '公益行动', value: 'public' }
]

onMounted(() => {
  locationStore.updateLocation()
})

// 进入页面时读取草稿并回填表单
onLoad(() => {
  restoreDraft()
})

// 页面隐藏时保存当前表单为草稿（内存状态保留，草稿作为兜底）
onHide(() => {
  saveDraft()
})

// 保存草稿：将当前表单内容写入本地存储
const saveDraft = () => {
  uni.setStorageSync(DRAFT_KEY, {
    reportType: reportType.value,
    description: description.value,
    location: {
      address: locationStore.address,
      latitude: locationStore.latitude,
      longitude: locationStore.longitude
    },
    media: mediaList.value
  })
}

// 恢复草稿：读取本地存储并回填，逐张校验媒体临时路径是否仍有效
const restoreDraft = async () => {
  const draft = uni.getStorageSync(DRAFT_KEY)
  if (!draft) return

  // 回填打卡类型与描述
  if (draft.reportType) reportType.value = draft.reportType
  if (draft.description) description.value = draft.description

  // 回填位置信息
  if (draft.location && draft.location.address) {
    locationStore.setAddress(draft.location.address)
    locationStore.setLatitude(draft.location.latitude)
    locationStore.setLongitude(draft.location.longitude)
  }

  // 回填媒体列表：逐张校验临时路径是否仍有效，失效的过滤掉
  if (draft.media && draft.media.length) {
    const validMedia = []
    for (const item of draft.media) {
      try {
        // 通过 getFileInfo 校验临时文件是否仍然存在
        await new Promise((resolve, reject) => {
          uni.getFileSystemManager().getFileInfo({ filePath: item.path, success: resolve, fail: reject })
        })
        validMedia.push(item)
      } catch (e) {
        console.error('草稿媒体文件已失效', item.path, e)
      }
    }
    if (validMedia.length) {
      mediaList.value = validMedia
    } else {
      // 原草稿有媒体但全部失效，提示用户重新选择
      uni.showToast({ title: '部分媒体已失效，请重新选择', icon: 'none' })
    }
  }
}

const chooseLocation = () => {
  uni.chooseLocation({
    success: (res) => {
      locationStore.setAddress(res.address + (res.name ? ` (${res.name})` : ''))
      locationStore.setLatitude(res.latitude)
      locationStore.setLongitude(res.longitude)
    },
    fail: (err) => {
      console.error('选择位置失败', err)
      if (err.errMsg && err.errMsg.indexOf('cancel') === -1) {
        locationStore.updateLocation()
      }
    }
  })
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
    uni.previewImage({
      urls: images,
      current: item.path
    })
  }
}

const submitReport = async () => {
  if (!userStore.isLoggedIn) {
    // 未登录：先保存草稿，再跳转登录页，登录后返回即可继续打卡
    saveDraft()
    uni.navigateTo({ url: '/pages/login/login?from=report' })
    return
  }
  
  if (mediaList.value.length < 1) {
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
          const fs = uni.getFileSystemManager()
          const fileInfo = await new Promise((resolve, reject) => {
            fs.getFileInfo({ filePath: filePath, success: resolve, fail: reject })
          })
          
          if (fileInfo.size > 1024 * 1024) {
            const compressRes = await new Promise((resolve, reject) => {
              uni.compressImage({ src: filePath, quality: 60, success: resolve, fail: reject })
            })
            filePath = compressRes.tempFilePath
          }
          
          const base64 = fs.readFileSync(filePath, 'base64')
          
          const checkRes = await wx.cloud.callFunction({
            name: 'checkContent',
            data: { type: 'image', imageBase64: base64 }
          })
          
          if (checkRes.result.code !== 200) {
            uni.showToast({ title: '图片包含违规内容', icon: 'none' })
            submitting.value = false
            return
          }
        }
        
        const url = await uploadFile(filePath)
        uploadedFiles.push({ type: item.type, url: url })
      } catch (e) {
        console.error('Upload or Check failed', e)
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
      } catch(e) {
        uni.showToast({ title: '文本审核失败', icon: 'none' })
        submitting.value = false
        return
      }
    }

    const reportData = {
      description: description.value,
      media: uploadedFiles,
      images: uploadedFiles.filter(f => f.type === 'image').map(f => f.url).join(','),
      type: reportType.value,
      latitude: locationStore.latitude,
      longitude: locationStore.longitude,
      address: locationStore.address,
      status: '0'
    }

    const res = await addReport(reportData)
    if (res.code === 200) {
      // 记录打卡次数（保留原有逻辑），并判断是否为首次打卡
      const isFirst = userStore.reportCount === 0
      userStore.incrementReportCount()
      // 计算本次预计获得的积分
      const points = REPORT_POINTS[reportType.value] || 10

      // 订阅消息授权（一次性订阅）：模板 ID 非空时请求，try/catch 包裹，不阻塞主流程
      if (SUBSCRIBE_TEMPLATE_ID) {
        try {
          wx.requestSubscribeMessage({
            tmplIds: [SUBSCRIBE_TEMPLATE_ID],
            complete: () => {}
          })
        } catch (e) {
          console.error('订阅消息请求失败', e)
        }
      }

      // 提交成功即时反馈：弹窗告知积分，确认后清除草稿并返回上一页
      uni.showModal({
        title: '打卡成功',
        content: `审核通过后将获得 ${points} 积分${isFirst ? '，首次通过额外奖励 +5 分' : ''}。内容需审核通过后展示。`,
        showCancel: false,
        confirmText: '知道了',
        success: () => {
          uni.removeStorageSync(DRAFT_KEY)
          uni.navigateBack()
        }
      })
      // 保留原有清空表单逻辑（以不报错为准）
      mediaList.value = []
      description.value = ''
    } else {
      uni.showToast({ title: res.msg || '打卡失败', icon: 'none' })
    }
  } catch (e) {
    console.error('Report failed', e)
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
  padding:0 0 40px;
}

// 头部背景
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

// 页面标题
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
    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .page-subtitle {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.8);
  }
}

// 表单卡片
.form-card {
  position: relative;
  z-index: 1;
  background: #fff;
  border-radius: 16px;
  margin: 0 16px 12px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
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

// 位置选择
.location-box {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 14px 16px;
  
  .location-icon {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    flex-shrink: 0;
    
    .icon-pin {
      width: 14px;
      height: 16px;
      background: #fff;
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
      position: relative;
      
      &::after {
        content: '';
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid #fff;
      }
      
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 6px;
        height: 6px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        border-radius: 50%;
        z-index: 1;
      }
    }
  }
  
  .location-info {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    
    .location-text {
      font-size: 14px;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block;
    }
  }
  
  .location-arrow {
    font-size: 20px;
    color: #ccc;
    margin-left: 8px;
  }
}

// 类型选择
.type-list {
  display: flex;
  gap: 10px;
}

.type-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 10px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.3s;
  
  &.active {
    background: #fff;
    border-color: #667eea;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
    
    .type-name {
      color: #667eea;
      font-weight: 600;
    }
  }
  
  .type-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
    
    &.beauty {
      background: #fff2e8;
      .icon-inner {
        width: 20px;
        height: 20px;
        background: #fa8c16;
        border-radius: 50%;
      }
    }
    
    &.behavior {
      background: #e6f7ff;
      .icon-inner {
        width: 18px;
        height: 18px;
        border: 3px solid #1890ff;
        border-radius: 50%;
      }
    }
    
    &.public {
      background: #f6ffed;
      .icon-inner {
        width: 16px;
        height: 16px;
        background: #52c41a;
        transform: rotate(45deg);
      }
    }
  }
  
  .type-name {
    font-size: 13px;
    color: #666;
  }
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
    
    image, .video-preview {
      width: 100%;
      height: 100%;
    }
    
    .delete-btn {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 22px;
      height: 22px;
      background: rgba(0,0,0,0.5);
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
