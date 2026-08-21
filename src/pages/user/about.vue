<template>
  <view class="container">
    <view class="logo-container">
      <image src="/static/logo.png" class="logo"></image>
      <view class="app-name">城市微光</view>
      <view class="version">Version {{version || '1.0.0'}}</view>
    </view>
    
    <view class="content">
      <view class="section">
        <view class="title">项目介绍</view>
        <view class="text">
          “城市微光”是一款城市地标与景区集章打卡小程序。走到全国地标、景区与特色街区的打卡点，拍照打卡即可点亮专属印章，集齐系列印章解锁隐藏徽章，生成足迹地图与打卡海报分享给好友。
        </view>
      </view>
      
      <view class="section">
        <view class="title">联系我们</view>
        <!-- <view class="cell">
          <text class="label">官方网站</text>
          <text class="value">www.cityglimmer.com</text>
        </view> -->
        <view class="cell">
          <text class="label">客服邮箱</text>
          <text class="value">myw3c@qq.com</text>
        </view>
      </view>
    </view>
    
    <view class="footer">
      <text>Copyright © 2026 城市微光 All Rights Reserved</text>
      <text>idea团队: web前端学习营地</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

const accountInfo = uni.getAccountInfoSync();
const version = computed(() => {
  return accountInfo.miniProgram.version
})
</script>

<style lang="scss">
.container {
  padding: 20px;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  
  .logo {
    width: 80px;
    height: 80px;
    border-radius: 16px;
    margin-bottom: 15px;
  }
  
  .app-name {
    font-size: 20px;
    font-weight: bold;
    color: #333;
    margin-bottom: 5px;
  }
  
  .version {
    font-size: 14px;
    color: #999;
  }
}

.content {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  
  .section {
    margin-bottom: 25px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .title {
      font-size: 16px;
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
      padding-left: 10px;
      border-left: 4px solid $uni-color-primary;
    }
    
    .text {
      font-size: 14px;
      color: #666;
      line-height: 1.6;
      text-indent: 2em;
    }
    
    .cell {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #f5f5f5;
      font-size: 14px;
      
      &:last-child {
        border-bottom: none;
      }
      
      .label {
        color: #666;
      }
      
      .value {
        color: #333;
      }
    }
  }
}

.footer {
  text-align: center;
  font-size: 12px;
  color: #ccc;
  padding: 20px 0;
  text{
    margin: 10px auto;
    display: block;
  }
}
</style>