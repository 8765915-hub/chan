<template>
  <view class="guide-page">
    <!-- 右上角"跳过"按钮：点击直接进入首页 -->
    <view class="skip-btn" :style="{ top: statusBarHeight + 10 + 'px' }" @click="handleSkip">
      跳过
    </view>

    <!-- 三屏引导轮播 -->
    <swiper class="guide-swiper" :current="current" @change="onSwiperChange">
      <!-- 第1屏：产品介绍 -->
      <swiper-item class="guide-item">
        <view class="slide-content">
          <view class="hero-icon">📸</view>
          <view class="hero-title">城市印章</view>
          <view class="hero-subtitle">打卡城市地标，集齐专属印章，点亮你的足迹地图</view>
        </view>
      </swiper-item>

      <!-- 第2屏：三步上手 -->
      <swiper-item class="guide-item">
        <view class="slide-content">
          <view class="section-title">三步上手</view>
          <view class="section-subtitle">轻松集齐城市印章</view>

          <view class="step-card">
            <view class="step-num">1</view>
            <view class="step-info">
              <view class="step-name">发现打卡点</view>
              <view class="step-desc">全国地标任你探索</view>
            </view>
          </view>
          <view class="step-arrow">↓</view>

          <view class="step-card">
            <view class="step-num">2</view>
            <view class="step-info">
              <view class="step-name">到点拍照</view>
              <view class="step-desc">实地打卡更有仪式感</view>
            </view>
          </view>
          <view class="step-arrow">↓</view>

          <view class="step-card">
            <view class="step-num">3</view>
            <view class="step-info">
              <view class="step-name">集齐印章</view>
              <view class="step-desc">解锁系列徽章与榜单</view>
            </view>
          </view>
        </view>
      </swiper-item>

      <!-- 第3屏：开始使用 -->
      <swiper-item class="guide-item">
        <view class="slide-content">
          <view class="hero-icon">✨</view>
          <view class="hero-title">准备好了吗？</view>
          <view class="hero-subtitle">一起点亮城市印章</view>
          <view class="start-btn" hover-class="btn-hover" @click="handleStart">开始使用</view>
        </view>
      </swiper-item>
    </swiper>

    <!-- 底部轮播指示点 -->
    <view class="dots">
      <view
        v-for="(item, index) in 3"
        :key="index"
        class="dot"
        :class="{ active: index === current }"
      ></view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// 当前轮播屏索引（0-2）
const current = ref(0)
// 系统状态栏高度，用于定位右上角"跳过"按钮
const statusBarHeight = ref(20)

onMounted(() => {
  getStatusBarHeight()
  // 引导页只要展示过一次就记录标记，避免每次打开小程序都出现
  // （即使玩家未点"跳过/开始使用"直接退出，下次也不再展示）
  try {
    uni.setStorageSync('guide_seen', '1')
  } catch (e) {
    console.error('记录引导页状态失败:', e)
  }
})

// 获取系统状态栏高度，保证"跳过"按钮不被刘海屏遮挡
const getStatusBarHeight = () => {
  try {
    const systemInfo = uni.getSystemInfoSync()
    statusBarHeight.value = systemInfo.statusBarHeight || 20
  } catch (e) {
    console.error('获取状态栏高度失败:', e)
  }
}

// 轮播切换时同步当前屏索引，用于指示点高亮
const onSwiperChange = (e) => {
  current.value = e.detail.current
}

// 写入"已看过引导页"标记并跳转首页（跳过 / 开始使用共用）
const finishGuide = () => {
  uni.setStorageSync('guide_seen', '1')
  uni.switchTab({ url: '/pages/index/index' })
}

// 点击右上角"跳过"：直接完成引导
const handleSkip = () => {
  finishGuide()
}

// 点击第3屏"开始使用"：完成引导并进入首页
const handleStart = () => {
  finishGuide()
}
</script>

<style lang="scss">
// 引导页根容器：全屏紫色渐变背景
.guide-page {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
}

// 右上角"跳过"按钮
.skip-btn {
  position: fixed;
  right: 24rpx;
  z-index: 10;
  padding: 8rpx 28rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 26rpx;
}

// 轮播容器铺满全屏
.guide-swiper {
  width: 100%;
  height: 100vh;
}

.guide-item {
  display: flex;
  align-items: center;
  justify-content: center;
}

// 每屏内容容器
.slide-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  padding: 0 60rpx 120rpx;
}

// 第1屏大图标
.hero-icon {
  font-size: 140rpx;
  line-height: 1.4;
  margin-bottom: 30rpx;
}

// 标题
.hero-title {
  font-size: 46rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 20rpx;
}

// 副文案
.hero-subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
  text-align: center;
}

// 第2屏标题
.section-title {
  font-size: 42rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 12rpx;
}

// 第2屏副标题
.section-subtitle {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 50rpx;
}

// 步骤卡片
.step-card {
  display: flex;
  align-items: center;
  width: 100%;
  background: #fff;
  border-radius: 20rpx;
  padding: 26rpx 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
}

// 步骤序号圆标
.step-num {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-size: 28rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 24rpx;
}

// 步骤文字区域
.step-info {
  display: flex;
  flex-direction: column;
}

.step-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 4rpx;
}

.step-desc {
  font-size: 26rpx;
  color: #999;
}

// 步骤之间的箭头
.step-arrow {
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.8);
  padding: 14rpx 0;
  line-height: 1;
}

// 第3屏"开始使用"大按钮
.start-btn {
  margin-top: 70rpx;
  width: 420rpx;
  height: 92rpx;
  border-radius: 46rpx;
  background: #fff;
  color: #667eea;
  font-size: 34rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.2);

  &.btn-hover {
    opacity: 0.85;
    transform: scale(0.98);
  }
}

// 底部指示点
.dots {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(60rpx + env(safe-area-inset-bottom));
  display: flex;
  justify-content: center;
  z-index: 10;

  .dot {
    width: 14rpx;
    height: 14rpx;
    border-radius: 7rpx;
    background: rgba(255, 255, 255, 0.4);
    margin: 0 8rpx;
    transition: all 0.3s;

    &.active {
      width: 34rpx;
      background: #fff;
    }
  }
}
</style>
