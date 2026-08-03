# Tasks

- [x] Task 1: 首次启动引导页与接入
  - [x] 新增 `src/pages/guide/guide.vue`（全屏 3 屏引导：产品介绍 / 三步上手 / 开始使用），支持滑动与"跳过"
  - [x] 使用 `uni.getStorageSync('guide_seen')` 标记，App.vue onLaunch 判断：未看过则 `uni.redirectTo` 引导页；看过则正常进入
  - [x] 点击"开始使用"写入标记并 `uni.switchTab` 到首页
- [x] Task 2: 首页地图空状态与定位降级
  - [x] `location.js` 暴露定位失败状态（已有 error 字段，补充 `getLocationError` 或复用 error）
  - [x] 首页 markers 为空且加载完成时，显示空状态卡片（文案 + "成为第一个打卡的人"按钮跳转打卡页）
  - [x] 定位失败时显示可点击提示条（"定位失败，点击重试或手动选择"），点击重试 `updateLocation`；不阻塞页面渲染
- [x] Task 3: 打卡登录前置与草稿续传
  - [x] `report.vue` 未登录提交时：先把当前表单保存为草稿 → `uni.navigateTo('/pages/login/login?from=report')`
  - [x] `login.vue` 登录成功后：若 `from=report` 或存在草稿，`uni.navigateBack` 返回打卡页
  - [x] 草稿持久化：进入打卡页读取 `report_draft`（类型/描述/位置/媒体路径）并回填；提交成功或清空时删除草稿；媒体临时路径失效（onMounted 校验失败）时清空媒体部分并轻提示
- [x] Task 4: 打卡提交即时反馈
  - [x] 提交成功后弹窗/Toast 展示"打卡成功，审核通过后将获得 XX 积分"（美景10/行为15/公益20）+ 审核流程提示（如"首次通过额外+5"）
- [x] Task 5: 审核结果订阅消息
  - [x] 新增 `src/config.js`：导出 `SUBSCRIBE_TEMPLATE_ID`（默认空字符串，附中文注释说明在微信公众平台申请模板）
  - [x] `report.vue` 提交成功后（若模板 ID 非空）调用 `wx.requestSubscribeMessage` 订阅一次性模板
  - [x] 云函数 `api/index.js` 审核逻辑：配置模板 ID（云函数侧常量）与审核结果后，调用 `subscribeMessage.send` 推送"通过/驳回"通知；未配置时静默跳过
- [x] Task 6: 首次打卡奖励（云函数）
  - [x] `handleAuditReport` 审核通过加分时：查询该用户是否已有其他 status=1 记录；若没有（首次），额外 `_.inc(5)` 并写入 points 记录（积分记录含"首卡奖励"）
- [x] Task 7: 官方种子内容
  - [x] 云函数新增 `url === '/seed/content'` 接口（仅管理员，非管理员返回 403）：按标记去重插入 3 条 status=1 官方示例（含类型/坐标/地址/描述/示意图片）
  - [x] `src/pages/admin/audit.vue` 增加"导入示例内容"按钮（仅管理员可见），调用接口后 Toast 结果
- [x] Task 8: 空状态文案完善
  - [x] 检查首页空状态、广场空状态文案，确保均有行动引导（首页已在 Task 2 覆盖；广场保持"成为第一个分享的人吧"，必要时补充行动按钮指向打卡页）

# Task Dependencies

- [Task 2] 依赖 [Task 1] 无（可并行）
- [Task 5] 的 `report.vue` 部分依赖 [Task 4]（提交反馈流程）；云函数部分与 [Task 6] 都在 `api/index.js` 中改动，建议顺序执行避免冲突
- [Task 7] 独立
- [Task 3] 独立
