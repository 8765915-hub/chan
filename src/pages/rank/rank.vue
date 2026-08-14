<template>
  <view class="container">
    <!-- 头部背景 -->
    <view class="header-bg">
      <view class="bg-circle c1"></view>
      <view class="bg-circle c2"></view>
    </view>

    <!-- Tab 切换 -->
    <view class="tab-wrap">
      <view class="tab-bar">
        <view 
          class="tab-item" 
          :class="{ active: currentTab === 'stamps' }" 
          @click="changeTab('stamps')"
        >
          <text class="tab-name">集章榜</text>
        </view>
        <view 
          class="tab-item" 
          :class="{ active: currentTab === 'week' }" 
          @click="changeTab('week')"
        >
          <text class="tab-name">周积分</text>
        </view>
        <view 
          class="tab-item" 
          :class="{ active: currentTab === 'total' }" 
          @click="changeTab('total')"
        >
          <text class="tab-name">总积分</text>
        </view>
        <!-- 滑块 -->
        <view class="tab-slider" :style="{ left: sliderLeft }"></view>
      </view>
    </view>

    <!-- 领奖台（前三名）- 始终显示 -->
    <view class="top-three-section">
      <view class="podium">
        <!-- 第二名 -->
        <view class="podium-item second" :class="{ empty: !rankList[1] }">
          <view class="avatar-wrap">
            <image 
              :src="rankList[1]?.avatar || '/static/images/icon.png'" 
              class="avatar" 
              mode="aspectFill"
            ></image>
            <view class="rank-badge silver">2</view>
          </view>
          <text class="name">{{ rankList[1]?.name || '虚位以待' }}</text>
          <text class="score">{{ rankList[1] ? rankList[1].score + scoreUnit : '--' }}</text>
        </view>

        <!-- 第一名 -->
        <view class="podium-item first" :class="{ empty: !rankList[0] }">
          <view class="crown" v-if="rankList[0]">👑</view>
          <view class="crown-placeholder" v-else></view>
          <view class="avatar-wrap">
            <image 
              :src="rankList[0]?.avatar || '/static/images/icon.png'" 
              class="avatar" 
              mode="aspectFill"
            ></image>
            <view class="rank-badge gold">1</view>
          </view>
          <text class="name">{{ rankList[0]?.name || '虚位以待' }}</text>
          <text class="score">{{ rankList[0] ? rankList[0].score + scoreUnit : '--' }}</text>
        </view>

        <!-- 第三名 -->
        <view class="podium-item third" :class="{ empty: !rankList[2] }">
          <view class="avatar-wrap">
            <image 
              :src="rankList[2]?.avatar || '/static/images/icon.png'" 
              class="avatar" 
              mode="aspectFill"
            ></image>
            <view class="rank-badge bronze">3</view>
          </view>
          <text class="name">{{ rankList[2]?.name || '虚位以待' }}</text>
          <text class="score">{{ rankList[2] ? rankList[2].score + scoreUnit : '--' }}</text>
        </view>
      </view>
    </view>

    <!-- 榜单列表 -->
    <view class="rank-section">
      <view class="section-header">
        <text class="header-title">{{ getScoreLabel() }}</text>
        <text class="header-count" v-if="rankList.length > 3">{{ rankList.length - 3 }} 人</text>
      </view>

      <!-- 加载中 -->
      <view class="loading-box" v-if="loading">
        <view class="spinner"></view>
      </view>

      <!-- 空数据 -->
      <view class="empty-box" v-else-if="rankList.length === 0">
        <text class="empty-text">暂无榜单数据</text>
      </view>

      <!-- 列表 -->
      <scroll-view 
        v-else-if="rankList.length > 3" 
        class="rank-scroll" 
        scroll-y 
        :style="{ height: scrollHeight + 'px' }"
      >
        <view class="rank-list">
          <view 
            class="rank-item" 
            v-for="(item, index) in rankList.slice(3)" 
            :key="index + 3"
          >
            <text class="rank-number">{{ index + 4 }}</text>
            <view class="user-info">
              <image :src="item.avatar" class="avatar" mode="aspectFill"></image>
              <text class="name">{{ item.name }}</text>
            </view>
            <text class="score">{{ item.score }}{{ scoreUnit }}</text>
          </view>
          <!-- 底部占位 -->
          <view class="list-bottom"></view>
        </view>
      </scroll-view>
      
      <!-- 不足4人时的提示 -->
      <view class="list-hint" v-else>
        <text>继续加油，冲击榜单前三！</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getRankList } from '../../api/rank'

const currentTab = ref('stamps')
const rankList = ref([])
const loading = ref(false)
const scrollHeight = ref(200)

// 滑块位置
const sliderLeft = computed(() => {
  const positions = { stamps: '16.66%', week: '50%', total: '83.33%' }
  return positions[currentTab.value]
})

// 分数单位：集章榜用"枚"，积分榜用"分"
const scoreUnit = computed(() => {
  return currentTab.value === 'stamps' ? ' 枚' : ' 分'
})

// 获取榜单标签文字
const getScoreLabel = () => {
  const labels = {
    stamps: '本周集章',
    week: '本周积分',
    total: '总积分'
  }
  return labels[currentTab.value] || '积分'
}

const loadRankList = async () => {
  loading.value = true
  try {
    // 集章榜走 stamps-week 接口
    const type = currentTab.value === 'stamps' ? 'stamps-week' : currentTab.value
    const res = await getRankList(type)
    if (res.code === 200) {
      rankList.value = res.rows.map(item => ({
        name: item.nickName || '未命名',
        score: item.stamps !== undefined ? item.stamps : (item.points || 0),
        avatar: item.avatarUrl || '/static/images/icon.png'
      }))
    }
  } catch (e) {
    console.error(e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const changeTab = (tab) => {
  if (currentTab.value === tab) return
  currentTab.value = tab
  loadRankList()
}

onShow(() => {
  loadRankList()
  // 计算滚动区域高度
  const systemInfo = uni.getSystemInfoSync()
  // 减去头部背景、tab、领奖台、榜单标题的高度（约 520px）
  scrollHeight.value = systemInfo.windowHeight - 320
})
</script>

<style lang="scss">
page {
  background: #f5f6fa;
  height: 100vh;
  overflow: hidden;
}

.container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

// 头部背景
.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 160px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: 0;
  
  .bg-circle {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    
    &.c1 {
      width: 180px;
      height: 180px;
      top: -50px;
      right: -50px;
    }
    
    &.c2 {
      width: 100px;
      height: 100px;
      bottom: 10px;
      left: -30px;
    }
  }
}

// Tab 切换
.tab-wrap {
  position: relative;
  z-index: 1;
  padding: 12px 5px 10px;
}

.tab-bar {
  display: flex;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  padding: 3px;
  position: relative;
  
  .tab-item {
    flex: 1;
    text-align: center;
    padding: 8px 0;
    border-radius: 8px;
    position: relative;
    z-index: 1;
    transition: all 0.3s;
    
    &.active {
      .tab-name {
        color: #764ba2;
        font-weight: 600;
      }
    }
    
    .tab-name {
      font-size: 15px;
      color: rgba(255, 255, 255, 0.9);
      transition: all 0.3s;
    }
  }
  
  .tab-slider {
    position: absolute;
    top: 3px;
    bottom: 3px;
    width: 30%;
    background: #fff;
    border-radius: 8px;
    transform: translateX(-50%);
    transition: left 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

// 领奖台
.top-three-section {
  position: relative;
  z-index: 1;
  padding: 0 5px;
  flex-shrink: 0;
}

.podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: #fff;
  border-radius: 16px;
  padding: 20px 16px 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.podium-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 80px;
  
  &.empty {
    opacity: 0.5;
    
    .avatar-wrap {
      .avatar {
        opacity: 0.3;
      }
    }
    
    .name {
      color: #ccc;
    }
    
    .score {
      color: #ddd;
    }
  }
  
  &.first {
    transform: translateY(-8px);
    
    .avatar-wrap {
      width: 64px;
      height: 64px;
      border: 3px solid #ffd700;
      box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
    }
    
    .name {
      font-size: 14px;
      font-weight: 600;
    }
    
    .score {
      color: #ff6b6b;
      font-weight: 600;
    }
  }
  
  &.second, &.third {
    .avatar-wrap {
      width: 52px;
      height: 52px;
    }
    
    .name {
      font-size: 13px;
    }
  }
  
  &.second .avatar-wrap {
    border: 2px solid #c0c0c0;
  }
  
  &.third .avatar-wrap {
    border: 2px solid #cd7f32;
  }
  
  .crown {
    font-size: 20px;
    margin-bottom: 2px;
  }
  
  .crown-placeholder {
    height: 22px;
  }
  
  .avatar-wrap {
    position: relative;
    border-radius: 50%;
    padding: 2px;
    background: #fff;
    margin-bottom: 8px;
    
    .avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #f0f0f0;
    }
    
    .rank-badge {
      position: absolute;
      bottom: -2px;
      left: 50%;
      transform: translateX(-50%);
      width: 18px;
      height: 18px;
      line-height: 18px;
      text-align: center;
      border-radius: 50%;
      font-size: 10px;
      font-weight: bold;
      color: #fff;
      border: 2px solid #fff;
      
      &.gold {
        background: linear-gradient(135deg, #ffd700, #ffb700);
      }
      
      &.silver {
        background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
      }
      
      &.bronze {
        background: linear-gradient(135deg, #cd7f32, #b56a28);
      }
    }
  }
  
  .name {
    color: #333;
    margin-bottom: 2px;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .score {
    font-size: 12px;
    color: #999;
  }
}

// 榜单区域
.rank-section {
  position: relative;
  z-index: 1;
  margin-top: 10px;
  padding: 0 5px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 0 4px;
  flex-shrink: 0;
  
  .header-title {
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }
  
  .header-count {
    font-size: 12px;
    color: #999;
  }
}

// 加载中
.loading-box {
  display: flex;
  justify-content: center;
  padding: 30px 0;
  flex: 1;
  align-items: center;
  
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #f0f0f0;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

// 空状态
.empty-box {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  
  .empty-text {
    font-size: 14px;
    color: #999;
  }
}

// 提示
.list-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 20px 0;
  
  text {
    font-size: 13px;
    color: #999;
  }
}

// 滚动区域
.rank-scroll {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

// 榜单列表
.rank-list {
  padding: 0 12px;
  
  .rank-item {
    display: flex;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #f5f5f5;
    
    &:last-child {
      border-bottom: none;
    }
    
    &:active {
      background: #fafafa;
    }
    
    .rank-number {
      width: 28px;
      font-size: 13px;
      color: #999;
      font-weight: 500;
    }
    
    .user-info {
      flex: 1;
      display: flex;
      align-items: center;
      
      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        margin-right: 10px;
        background: #f0f0f0;
      }
      
      .name {
        font-size: 14px;
        color: #333;
      }
    }
    
    .score {
      font-size: 14px;
      color: #ff6b6b;
      font-weight: 600;
    }
  }
  
  .list-bottom {
    height: 10px;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
