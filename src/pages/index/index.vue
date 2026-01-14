<template>
  <view class="container">
    <view class="location-card card">
      <view class="title">当前位置</view>
      <view class="address" @click="refreshLocation">
        <text class="uni-icon uni-icon-location"></text>
        {{ locationStore.address }}
      </view>
      <button size="mini" type="default" @click="refreshLocation">刷新定位</button>
    </view>

    <view class="upload-card card">
      <view class="title">上传照片 (需包含：发现、清理中、清理后)</view>
      <view class="image-list">
        <view class="image-item" v-for="(img, index) in images" :key="index">
          <image :src="img" mode="aspectFill" @click="previewImage(index)"></image>
          <view class="delete" @click="deleteImage(index)">x</view>
        </view>
        <view class="add-btn" v-if="images.length < 3" @click="chooseImage">
          <text>+</text>
        </view>
      </view>
    </view>

    <view class="desc-card card">
      <view class="title">描述说明</view>
      <textarea v-model="description" placeholder="请输入描述信息..." class="desc-input" />
    </view>

    <button class="submit-btn btn-primary" :loading="submitting" @click="submitReport">立即上报</button>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useLocationStore } from '@/store/modules/location'
import { useUserStore } from '@/store/modules/user'

const locationStore = useLocationStore()
const userStore = useUserStore()

const images = ref([])
const description = ref('')
const submitting = ref(false)

onMounted(() => {
  locationStore.updateLocation()
})

const refreshLocation = () => {
  locationStore.updateLocation()
}

const chooseImage = () => {
  uni.chooseImage({
    count: 3 - images.value.length,
    sizeType: ['compressed'],
    success: (res) => {
      // Mock watermark processing would happen here
      images.value = [...images.value, ...res.tempFilePaths]
    }
  })
}

const deleteImage = (index) => {
  images.value.splice(index, 1)
}

const previewImage = (index) => {
  uni.previewImage({
    urls: images.value,
    current: index
  })
}

const submitReport = async () => {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.switchTab({ url: '/pages/user/user' }), 1500)
    return
  }
  if (images.value.length < 3) {
    uni.showToast({ title: '请上传3张照片', icon: 'none' })
    return
  }
  
  submitting.value = true
  
  // Simulate API call and upload
  setTimeout(() => {
    submitting.value = false
    uni.showToast({ title: '上报成功 +10积分', icon: 'success' })
    userStore.addPoints(10)
    images.value = []
    description.value = ''
  }, 2000)
}
</script>

<style lang="scss">
.location-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .address {
    font-size: 14px;
    color: #666;
    flex: 1;
    margin-right: 10px;
  }
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  margin-top: 10px;
  
  .image-item {
    width: 30%;
    height: 80px;
    margin-right: 3%;
    margin-bottom: 10px;
    position: relative;
    
    image {
      width: 100%;
      height: 100%;
      border-radius: 4px;
    }
    
    .delete {
      position: absolute;
      top: -5px;
      right: -5px;
      background: red;
      color: white;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      text-align: center;
      line-height: 18px;
      font-size: 12px;
    }
  }
  
  .add-btn {
    width: 30%;
    height: 80px;
    border: 1px dashed #ccc;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 30px;
    color: #ccc;
    border-radius: 4px;
  }
}

.desc-input {
  width: 100%;
  height: 80px;
  font-size: 14px;
  margin-top: 10px;
  border: 1px solid #eee;
  padding: 5px;
  border-radius: 4px;
}

.submit-btn {
  margin-top: 30px;
}
</style>
