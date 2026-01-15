<template>
  <view class="container login-page">
    <view class="logo-box">
      <image src="/static/logo.png" mode="widthFix" class="logo"></image>
      <text class="title">铲一铲</text>
    </view>
    <button type="primary" class="login-btn" @click="doLogin">微信一键登录</button>
    <button type="default" class="cancel-btn" @click="goBack">暂不登录</button>
  </view>
</template>

<script setup>
import { useUserStore } from '@/store/modules/user'

const userStore = useUserStore()

const doLogin = async () => {
  await userStore.login()
  uni.navigateBack()
}

const goBack = () => {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss">
.login-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.logo-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 50px;
  
  .logo {
    width: 80px;
    height: 80px;
    margin-bottom: 10px;
  }
  
  .title {
    font-size: 24px;
    font-weight: bold;
    color: $uni-color-primary;
  }
}

.login-btn {
  width: 80%;
  border-radius: 40px;
  margin-bottom: 15px;
}

.cancel-btn {
  width: 80%;
  border-radius: 40px;
  background: transparent;
  border: 1px solid #ccc;
  color: #999;
}
</style>
