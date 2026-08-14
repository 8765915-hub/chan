<template>
  <view class="container">
    <!-- 印章统计头部 -->
    <view class="header">
      <view class="stamp-card">
        <view class="stamp-bg">
          <view class="circle circle-1"></view>
          <view class="circle circle-2"></view>
        </view>
        <view class="stamp-content">
          <view class="stamp-icon">
            <text class="icon">🕹️</text>
          </view>
          <view class="stamp-info">
            <text class="label">已收集印章</text>
            <view class="num-row">
              <text class="num">{{ album.totalCollected }}</text>
              <text class="total">/ {{ album.totalSpots || 186 }}</text>
            </view>
          </view>
        </view>
        <view class="progress-bar">
          <view class="progress-inner" :style="{ width: progressPercent + '%' }"></view>
        </view>
        <view class="progress-text">集齐一个省的全部印章，即可解锁该省系列徽章</view>
      </view>
    </view>

    <!-- 系列进度 -->
    <view class="section">
      <view class="section-header">
        <view class="section-title">
          <text class="title-icon">🗂️</text>
          <text class="title-text">系列进度</text>
        </view>
        <text class="section-desc">{{ completedCount }} 个系列已完成</text>
      </view>

      <view class="series-list">
        <view
          class="series-item"
          v-for="group in seriesGroups"
          :key="group.province"
          @click="toggleExpand(group.province)"
        >
          <view class="series-head">
            <view class="series-info">
              <text class="series-name">{{ group.series }}</text>
              <text class="series-province">{{ group.province }} · {{ group.collected }}/{{ group.total }} 枚</text>
            </view>
            <view class="series-right">
              <view class="series-bar">
                <view class="series-bar-inner" :style="{ width: (group.total ? group.collected / group.total * 100 : 0) + '%' }"></view>
              </view>
              <text class="series-done" v-if="group.done">✓ 完成</text>
              <text class="series-arrow" :class="{ open: expanded === group.province }">›</text>
            </view>
          </view>

          <!-- 展开的省印章 -->
          <view class="series-detail" v-if="expanded === group.province">
            <view
              class="stamp-cell"
              v-for="s in group.spots"
              :key="s.code"
              :class="{ done: s.checkedIn }"
            >
              <view class="stamp-seal">
                <text class="seal-emoji">{{ getCategoryEmoji(s.category) }}</text>
                <text class="seal-check" v-if="s.checkedIn">✓</text>
              </view>
              <text class="stamp-name">{{ s.name }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 已收集印章时间线 -->
    <view class="section" v-if="album.stamps && album.stamps.length > 0">
      <view class="section-header">
        <view class="section-title">
          <text class="title-icon">📸</text>
          <text class="title-text">最近收集</text>
        </view>
      </view>
      <view class="stamp-timeline">
        <view class="timeline-item" v-for="(item, index) in album.stamps.slice(0, 8)" :key="index">
          <view class="timeline-seal">
            <text class="seal-emoji">{{ getModeEmoji(item.mode) }}</text>
          </view>
          <view class="timeline-info">
            <text class="timeline-name">{{ item.spotName }}</text>
            <text class="timeline-time">{{ getModeLabel(item.mode) }} · {{ formatDate(item.createTime) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-if="album.totalCollected === 0">
      <text class="empty-icon">🕹️</text>
      <text class="empty-text">还没有收集印章</text>
      <text class="empty-tip">去地图找找打卡点，点亮第一枚印章吧</text>
      <button class="empty-btn" @click="goReport">去打卡集章</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/modules/user'
import { getMyStamps, listSpots } from '@/api/spot'
import { getSeriesName, getModeLabel } from '@/utils/series'

const userStore = useUserStore()
const album = ref({ stamps: [], provinces: [], totalCollected: 0, totalSpots: 0 })
const allSpots = ref([])
const expanded = ref('')

const seriesGroups = computed(() => {
  const groups = []
  const byProvince = {}
  allSpots.value.forEach(s => {
    if (!byProvince[s.province]) byProvince[s.province] = []
    byProvince[s.province].push(s)
  })
  Object.keys(byProvince).sort().forEach(province => {
    const spots = byProvince[province]
    const collected = spots.filter(s => s.checkedIn).length
    groups.push({
      province,
      series: getSeriesName(province),
      total: spots.length,
      collected,
      done: collected === spots.length && spots.length > 0,
      spots
    })
  })
  return groups
})

const progressPercent = computed(() => {
  if (!album.value.totalSpots) return 0
  return Math.round(album.value.totalCollected / album.value.totalSpots * 100)
})

const completedCount = computed(() => {
  return seriesGroups.value.filter(g => g.done).length
})

onShow(async () => {
  if (userStore.isLoggedIn) userStore.getUserInfo()
  await Promise.all([loadAlbum(), loadSpots()])
})

const loadAlbum = async () => {
  try {
    const res = await getMyStamps()
    if (res.code === 200) {
      album.value = res.data
    }
  } catch (e) {
    console.error('Load album failed:', e)
  }
}

const loadSpots = async () => {
  try {
    const res = await listSpots({ limit: 500 })
    if (res.code === 200) {
      allSpots.value = res.rows || []
    }
  } catch (e) {
    console.error('Load spots failed:', e)
  }
}

const toggleExpand = (province) => {
  expanded.value = expanded.value === province ? '' : province
}

const getCategoryEmoji = (category) => {
  const map = { '自然': '🏔️', '人文': '🏯', '街区': '🏮', '地标': '🗼' }
  return map[category] || '📍'
}

const getModeEmoji = (mode) => {
  const map = { onSite: '📍', memory: '📷', cloud: '☁️' }
  return map[mode] || '🕹️'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const pad = n => (n < 10 ? '0' + n : n)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const goReport = () => {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f3efff 0%, #f8f8f8 30%, #f8f8f8 100%);
  padding-bottom: 30px;
}

// 印章统计头部
.header {
  padding: 20px;

  .stamp-card {
    position: relative;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    padding: 25px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.35);

    .stamp-bg {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;

      .circle {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);

        &.circle-1 {
          width: 150px;
          height: 150px;
          top: -50px;
          right: -30px;
        }

        &.circle-2 {
          width: 80px;
          height: 80px;
          bottom: -20px;
          left: 20px;
        }
      }
    }

    .stamp-content {
      position: relative;
      display: flex;
      align-items: center;
      z-index: 1;
      margin-bottom: 16px;

      .stamp-icon {
        width: 60px;
        height: 60px;
        background: rgba(255, 255, 255, 0.25);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 15px;

        .icon {
          font-size: 30px;
        }
      }

      .stamp-info {
        .label {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
          display: block;
          margin-bottom: 4px;
        }

        .num-row {
          display: flex;
          align-items: baseline;

          .num {
            font-size: 40px;
            font-weight: bold;
            color: #fff;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .total {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.8);
            margin-left: 6px;
          }
        }
      }
    }

    .progress-bar {
      position: relative;
      z-index: 1;
      height: 8px;
      background: rgba(255, 255, 255, 0.25);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 10px;

      .progress-inner {
        height: 100%;
        background: #fff;
        border-radius: 4px;
        transition: width 0.5s;
      }
    }

    .progress-text {
      position: relative;
      z-index: 1;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.85);
    }
  }
}

// 区域标题
.section {
  padding: 0 15px;
  margin-top: 6px;

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 15px;
    padding: 0 5px;

    .section-title {
      display: flex;
      align-items: center;

      .title-icon {
        font-size: 20px;
        margin-right: 8px;
      }

      .title-text {
        font-size: 18px;
        font-weight: bold;
        color: #333;
      }
    }

    .section-desc {
      font-size: 12px;
      color: #999;
    }
  }
}

// 系列列表
.series-list {
  background: #fff;
  border-radius: 16px;
  padding: 4px 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.series-item {
  border-bottom: 1px solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }

  .series-head {
    display: flex;
    align-items: center;
    padding: 14px 0;

    .series-info {
      flex: 1;
      min-width: 0;

      .series-name {
        font-size: 15px;
        font-weight: 600;
        color: #333;
        display: block;
        margin-bottom: 4px;
      }

      .series-province {
        font-size: 12px;
        color: #999;
      }
    }

    .series-right {
      display: flex;
      align-items: center;

      .series-bar {
        width: 70px;
        height: 6px;
        background: #f0f0f0;
        border-radius: 3px;
        overflow: hidden;
        margin-right: 10px;

        .series-bar-inner {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 3px;
        }
      }

      .series-done {
        font-size: 11px;
        color: #4caf50;
        font-weight: bold;
        margin-right: 8px;
      }

      .series-arrow {
        font-size: 18px;
        color: #ccc;
        transition: transform 0.2s;

        &.open {
          transform: rotate(90deg);
        }
      }
    }
  }

  .series-detail {
    display: flex;
    flex-wrap: wrap;
    padding: 0 4px 14px;

    .stamp-cell {
      width: 25%;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 14px;

      .stamp-seal {
        position: relative;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        border: 2px dashed #ddd;
        background: #fafafa;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 6px;

        .seal-emoji {
          font-size: 24px;
        }

        .seal-check {
          position: absolute;
          bottom: -4px;
          right: -4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #4caf50;
          color: #fff;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }

      &.done {
        .stamp-seal {
          border: 2px solid #667eea;
          background: linear-gradient(135deg, #667eea, #764ba2);
          box-shadow: 0 4px 10px rgba(102, 126, 234, 0.35);

          .seal-emoji {
            filter: brightness(0) invert(1);
            opacity: 0.9;
          }
        }

        .stamp-name {
          color: #333;
          font-weight: 600;
        }
      }

      .stamp-name {
        font-size: 11px;
        color: #bbb;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 90%;
      }
    }
  }
}

// 最近收集时间线
.stamp-timeline {
  background: #fff;
  border-radius: 16px;
  padding: 6px 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

  .timeline-item {
    display: flex;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #f7f7f7;

    &:last-child {
      border-bottom: none;
    }

    .timeline-seal {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      flex-shrink: 0;

      .seal-emoji {
        font-size: 20px;
        filter: brightness(0) invert(1);
      }
    }

    .timeline-info {
      .timeline-name {
        font-size: 15px;
        font-weight: 500;
        color: #333;
        display: block;
        margin-bottom: 3px;
      }

      .timeline-time {
        font-size: 12px;
        color: #999;
      }
    }
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;

  .empty-icon {
    font-size: 60px;
    margin-bottom: 10px;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 15px;
    color: #666;
    margin-bottom: 6px;
  }

  .empty-tip {
    font-size: 12px;
    color: #999;
    margin-bottom: 20px;
  }

  .empty-btn {
    height: 40px;
    line-height: 40px;
    padding: 0 40px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #fff;
    font-size: 14px;
    border-radius: 20px;

    &::after {
      border: none;
    }
  }
}
</style>
