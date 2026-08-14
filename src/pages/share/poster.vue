<template>
  <view class="poster-page">
    <view class="poster-tip">生成专属打卡海报，分享给好友一起集章</view>
    <canvas
      canvas-id="posterCanvas"
      id="posterCanvas"
      class="poster-canvas"
      :style="canvasStyle"
    ></canvas>
    <view class="actions">
      <button class="action-btn save-btn" @click="savePoster">保存图片</button>
      <button class="action-btn share-btn" open-type="share">分享给好友</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onReady, onShareAppMessage } from '@dcloudio/uni-app'

const canvasW = 300
const canvasH = 440
// 模板中通过 computed 访问，避免编译期常量内联问题
const canvasStyle = computed(() => ({
  width: canvasW + 'px',
  height: canvasH + 'px'
}))
const shareData = ref({
  image: '',
  spotName: '',
  sub: '',
  date: ''
})

onLoad((query) => {
  shareData.value = {
    image: decodeURIComponent(query.image || ''),
    spotName: decodeURIComponent(query.spotName || ''),
    sub: decodeURIComponent(query.sub || ''),
    date: decodeURIComponent(query.date || '')
  }
})

onReady(() => {
  drawPoster()
})

const drawPoster = () => {
  const ctx = uni.createCanvasContext('posterCanvas')

  // 背景渐变
  const grad = ctx.createLinearGradient(0, 0, 0, canvasH)
  grad.addColorStop(0, '#667eea')
  grad.addColorStop(1, '#764ba2')
  ctx.setFillStyle(grad)
  ctx.fillRect(0, 0, canvasW, canvasH)

  // 装饰圆
  ctx.setFillStyle('rgba(255,255,255,0.08)')
  ctx.beginPath()
  ctx.arc(canvasW - 30, 40, 70, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(20, canvasH - 60, 50, 0, Math.PI * 2)
  ctx.fill()

  // 照片区
  const photoH = 240
  if (shareData.value.image) {
    wx.getImageInfo({
      src: shareData.value.image,
      success: (info) => {
        const imgW = info.width
        const imgH = info.height
        // 居中裁剪填充 300x240
        const scale = Math.max(canvasW / imgW, photoH / imgH)
        const sw = canvasW / scale
        const sh = photoH / scale
        const sx = (imgW - sw) / 2
        const sy = (imgH - sh) / 2
        ctx.drawImage(info.path, sx, sy, sw, sh, 0, 30, canvasW, photoH)
        drawTexts(ctx)
        ctx.draw()
      },
      fail: () => {
        // 无图或加载失败：画占位
        ctx.setFillStyle('rgba(255,255,255,0.15)')
        ctx.fillRect(0, 30, canvasW, photoH)
        drawTexts(ctx)
        ctx.draw()
      }
    })
  } else {
    ctx.setFillStyle('rgba(255,255,255,0.15)')
    ctx.fillRect(0, 30, canvasW, photoH)
    drawTexts(ctx)
    ctx.draw()
  }
}

const drawTexts = (ctx) => {
  // 印章
  ctx.setFillStyle('#e74c3c')
  ctx.beginPath()
  ctx.arc(250, 60, 26, 0, Math.PI * 2)
  ctx.fill()
  ctx.setFillStyle('#fff')
  ctx.setFontSize(18)
  ctx.setTextAlign('center')
  ctx.fillText('章', 250, 68)

  // 打卡成功标题
  ctx.setFillStyle('#fff')
  ctx.setFontSize(24)
  ctx.setTextAlign('left')
  ctx.fillText('打卡成功 · 印章已点亮', 20, 300)

  // 打卡点名
  ctx.setFontSize(20)
  ctx.fillText(shareData.value.spotName || '城市地标', 20, 334)

  // 副信息
  ctx.setFontSize(13)
  ctx.setFillStyle('rgba(255,255,255,0.85)')
  ctx.fillText(shareData.value.sub || '', 20, 360)
  ctx.fillText(shareData.value.date || '', 20, 382)

  // 底部口号
  ctx.setFontSize(14)
  ctx.setFillStyle('rgba(255,255,255,0.9)')
  ctx.setTextAlign('center')
  ctx.fillText('城市印章 · 打卡城市地标，集齐专属印章', canvasW / 2, 416)
}

const savePoster = () => {
  uni.canvasToTempFilePath({
    canvasId: 'posterCanvas',
    destWidth: canvasW * 3,
    destHeight: canvasH * 3,
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => {
          uni.showToast({ title: '已保存到相册', icon: 'success' })
        },
        fail: (err) => {
          if (err.errMsg && err.errMsg.indexOf('auth') > -1) {
            uni.showModal({
              title: '需要相册权限',
              content: '请在设置中开启保存到相册的权限',
              confirmText: '去设置',
              success: (r) => {
                if (r.confirm) uni.openSetting()
              }
            })
          } else {
            uni.showToast({ title: '保存失败', icon: 'none' })
          }
        }
      })
    },
    fail: (err) => {
      console.error('canvasToTempFilePath failed:', err)
      uni.showToast({ title: '海报生成失败', icon: 'none' })
    }
  })
}

onShareAppMessage(() => {
  return {
    title: `我在「城市印章」点亮了「${shareData.value.spotName || '城市地标'}」的印章，一起来集章吧！`,
    path: '/pages/index/index',
    imageUrl: shareData.value.image || '/static/logo.png'
  }
})
</script>

<style lang="scss">
.poster-page {
  min-height: 100vh;
  background: #f5f6fa;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 20px;

  .poster-tip {
    font-size: 13px;
    color: #999;
    margin-bottom: 20px;
  }

  .poster-canvas {
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
    background: #667eea;
  }

  .actions {
    display: flex;
    gap: 20px;
    margin-top: 30px;
    width: 100%;
    padding: 0 30px;
    box-sizing: border-box;

    .action-btn {
      flex: 1;
      height: 46px;
      line-height: 46px;
      border-radius: 23px;
      font-size: 15px;
      font-weight: 600;

      &::after {
        border: none;
      }
    }

    .save-btn {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
    }

    .share-btn {
      background: #fff;
      color: #667eea;
      border: 2rpx solid #667eea;
    }
  }
}
</style>
