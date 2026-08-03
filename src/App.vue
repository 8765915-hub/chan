<script>
import { useUserStore } from '@/store/modules/user'
import { checkUpdate } from '@/utils/update'

export default {
  onLaunch: function () {
    console.log('App Launch')
    
    // 检查更新
    checkUpdate()
    
    // 初始化云开发环境
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloudbase-2gknmgzd611e80b4',
        traceUser: true,
      })
    }
    
    // 首次启动引导：未看过引导页则跳转到引导页（用 try/catch 包裹避免异常影响启动）
    try {
      const guideSeen = uni.getStorageSync('guide_seen')
      if (!guideSeen) {
        uni.redirectTo({ url: '/pages/guide/guide' })
      }
    } catch (e) {
      console.error('引导页判断失败:', e)
    }
    
    const userStore = useUserStore()
    userStore.init()
  },
  onShow: function () {
    console.log('App Show')
  },
  onHide: function () {
    console.log('App Hide')
  },
}
</script>

<style lang="scss">
/* 每个页面公共css */
/* #ifndef APP-NVUE */
@import '@/static/custom.scss';
// 设置整个项目的背景色
page {
	background-color: #f5f5f5;
}
/* #endif */
</style>
