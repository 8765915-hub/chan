import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

export function useGlobalShare(options = {}) {
  const defaultShare = {
    title: '城市微光 - 打卡城市地标，集齐专属印章',
    path: '/pages/index/index',
    imageUrl: '/static/logo.png',
    ...options
  }

  onShareAppMessage(() => {
    return {
      title: defaultShare.title,
      path: defaultShare.path,
      imageUrl: defaultShare.imageUrl
    }
  })

  onShareTimeline(() => {
    return {
      title: defaultShare.title,
      query: ''
    }
  })
}

export default useGlobalShare