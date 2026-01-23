<template>
  <view class="container">
    <view class="list" v-if="list.length > 0">
      <view class="item" v-for="(item, index) in list" :key="index">
        <view class="row-1">
          <view class="desc">{{ item.description || '无描述' }}</view>
          <view class="time">{{ formatDate(item.createTime) }}</view>
        </view>
        <view class="row-2" v-if="item.images">
          <scroll-view scroll-x="true" class="img-scroll">
            <view class="img-list">
              <image 
                v-for="(img, i) in item.images.split(',')" 
                :key="i" 
                :src="img" 
                mode="aspectFill" 
                class="thumb"
                @click="previewImage(item.images.split(','), i)"
              ></image>
            </view>
          </scroll-view>
        </view>
        <view class="row-3">
          <view class="location">
            <text class="uni-icon uni-icon-location"></text>
            {{ item.address || '未知地点' }}
          </view>
        </view>
        <view class="actions">
          <button size="mini" type="warn" class="btn reject" @click="handleAudit(item, '2')">驳回</button>
          <button size="mini" type="primary" class="btn approve" @click="handleAudit(item, '1')">通过(+10分)</button>
        </view>
      </view>
    </view>
    <view class="empty" v-else>
      <text>暂无待审核记录</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { request } from '@/utils/request'

const list = ref([])

const getList = async () => {
  try {
    uni.showLoading({ title: '加载中' })
    const res = await request({
      url: '/admin/report/list',
      method: 'GET'
    })
    if (res.code === 200) {
      list.value = res.rows
    }
  } catch (e) {
    console.error(e)
    uni.showToast({ title: '获取列表失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

const handleAudit = (item, status) => {
  let content = status === '1' ? '确认审核通过并奖励10积分？' : '确认驳回该上报？'
  let placeholder = status === '2' ? '请输入驳回理由' : ''
  
  uni.showModal({
    title: '审核确认',
    content: content,
    editable: status === '2',
    placeholderText: placeholder,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '提交中' })
          const auditRes = await request({
            url: '/admin/report/audit',
            method: 'POST',
            data: {
              id: item._id, // Cloud DB use _id
              status: status,
              remark: res.content || '',
              points: status === '1' ? 10 : 0
            }
          })
          
          uni.hideLoading()
          if (auditRes.code === 200) {
            uni.showToast({ title: '操作成功' })
            getList() // Refresh list
          } else {
            uni.showToast({ title: auditRes.msg || '操作失败', icon: 'none' })
          }
        } catch (e) {
          uni.hideLoading()
          uni.showToast({ title: '操作异常', icon: 'none' })
        }
      }
    }
  })
}

const previewImage = (urls, current) => {
  uni.previewImage({
    urls,
    current
  })
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}`
}

onShow(() => {
  getList()
})
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 10px;
}

.item {
  background: #fff;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  
  .row-1 {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    
    .desc {
      font-weight: bold;
      font-size: 16px;
      flex: 1;
    }
    .time {
      font-size: 12px;
      color: #999;
      margin-left: 10px;
    }
  }
  
  .row-2 {
    margin-bottom: 10px;
    .img-scroll {
      white-space: nowrap;
      .img-list {
        display: flex;
        .thumb {
          width: 80px;
          height: 80px;
          border-radius: 4px;
          margin-right: 8px;
        }
      }
    }
  }
  
  .row-3 {
    margin-bottom: 15px;
    .location {
      font-size: 12px;
      color: #666;
    }
  }
  
  .actions {
    display: flex;
    justify-content: flex-end;
    
    .btn {
      margin-left: 10px;
      margin-right: 0;
    }
  }
}

.empty {
  text-align: center;
  margin-top: 50px;
  color: #999;
}
</style>