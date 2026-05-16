# 页面级真人点击 E2E 测试报告

- 时间：2026-05-14T01:45:36.897Z
- 地址：http://localhost:3001
- 通过：26
- 失败：0
- 创建订单：422/ORD-8918766b-bd0e-4882-8e96-917af0e9ac21/pending, 423/ORD-353bd865-f848-4145-a0d0-0dfb992dedfa/pending, 424/ORD-292166d7-cbc8-46ae-84c8-4060df5583f4/pending

## 明细

- ✅ 2026-05-14T01:45:02.043Z 测试前数据库快照：orders=419, reviews=211
- ✅ 2026-05-14T01:45:05.196Z 前台真人点击：用户登录：Reviews About Us Contact Us Today's Deals All Products Customization Flash Sale categories.all Teapots Cups Accessories Sets 🇺🇸 English Test User 2 T Test User 2 test2@example.com regular 0 积分 账户概览 订单管理 地址管理 收藏夹 优惠券 消息中心 个人设置 退出登录 账户概览 个人信息 姓名 Test User 2 邮箱 test2@example.com 电话 13800138001 角色 user 账户信息 会员等级 regular 积分 0 总消费 0 AED 推荐码 605C1F0FEE 最近订单 暂无订单记录 紫砂陶艺 为世界各地的茶爱好者提供正宗的中国紫砂陶艺，传承千年工艺，品味生活之美。 快速链接 Home Shop About Us Contact Us 产品分类 茶壶 茶杯 配件 套装 联系我们 info@zishapottery.com +86 123 4567 8910
- ✅ 2026-05-14T01:45:09.010Z 后台真人点击：admin 登录并进入仪表盘：Reviews About Us Contact Us Today's Deals All Products Customization Flash Sale categories.all Teapots Cups Accessories Sets 🇺🇸 English E2E管理员 紫砂后台管理 Zisha Admin Console 数据看板 📊 今日概览 订单中心 🧾 全部订单 商品中心 📦 商品列表 🏷️ 商品分类 库存中心 🏬 库存总览 🔔 库存预警 ✅ 盘点任务 营销中心 🎯 促销规则 🎟️ 优惠券管理 支付中心 💳 支付配置 💸 支付流水 ↩️ 退款流水 📜 回调日志 用户中心 👥 用户列表 评价中心 ⭐ 商品评价 内容与风格 🏠 首页模块 ℹ️ 关于我们 📞 联系方式 🛡️ 服务保障 🎨 主题风格 🌐 多语言配置 系统设置 🔐 管理员权限 💱 汇率设置 🗂️ 审计日志 🗃️ 数据库检查 ⚙️ 系统配置 Admin / Dashboard OVERVIEW 管理控制台 基于真实订单、用户、商品和库存数据生成今日运营概览。 刷新
- ✅ 2026-05-14T01:45:09.025Z 测试数据校验：可售商品：[{"id":1},{"id":2},{"id":3},{"id":4},{"id":5}]
- ✅ 2026-05-14T01:45:10.341Z 页面点击：快速下单提交订单：按钮可见且非 disabled
- ✅ 2026-05-14T01:45:12.858Z 前台真人点击：商品详情立即购买并提交订单：{"id":422,"order_number":"ORD-8918766b-bd0e-4882-8e96-917af0e9ac21","order_status":"pending","payment_status":"pending","payment_method":"paypal","final_amount":59.13}
- ✅ 2026-05-14T01:45:12.868Z 数据库校验：订单 ORD-8918766b-bd0e-4882-8e96-917af0e9ac21 创建后 pending：{"id":422,"order_number":"ORD-8918766b-bd0e-4882-8e96-917af0e9ac21","order_status":"pending","payment_status":"pending","payment_method":"paypal","final_amount":59.13}
- ✅ 2026-05-14T01:45:12.869Z 日志文件校验：订单 ORD-8918766b-bd0e-4882-8e96-917af0e9ac21 创建：存在日志/trace：.next/trace
- ✅ 2026-05-14T01:45:14.698Z 后台页面校验：快速下单订单进入后台：找到订单 ORD-8918766b-bd0e-4882-8e96-917af0e9ac21
- ✅ 2026-05-14T01:45:18.643Z 页面点击：购物车提交订单：按钮可见且非 disabled
- ✅ 2026-05-14T01:45:21.163Z 前台真人点击：加入购物车并结算：{"id":423,"order_number":"ORD-353bd865-f848-4145-a0d0-0dfb992dedfa","order_status":"pending","payment_status":null,"payment_method":"paypal","final_amount":139.5}
- ✅ 2026-05-14T01:45:21.176Z 数据库校验：购物车订单 ORD-353bd865-f848-4145-a0d0-0dfb992dedfa 创建后 pending：{"id":423,"order_number":"ORD-353bd865-f848-4145-a0d0-0dfb992dedfa","order_status":"pending","payment_status":null,"payment_method":"paypal","final_amount":139.5}
- ✅ 2026-05-14T01:45:21.176Z 日志文件校验：购物车订单 ORD-353bd865-f848-4145-a0d0-0dfb992dedfa 创建：存在日志/trace：.next/trace
- ✅ 2026-05-14T01:45:22.999Z 后台页面校验：购物车订单进入后台：找到订单 ORD-353bd865-f848-4145-a0d0-0dfb992dedfa
- ✅ 2026-05-14T01:45:25.732Z 前台真人点击：取消订单：{"id":423,"order_number":"ORD-353bd865-f848-4145-a0d0-0dfb992dedfa","order_status":"cancelled"}
- ✅ 2026-05-14T01:45:25.732Z 日志文件校验：取消订单 423：存在日志/trace：.next/trace
- ✅ 2026-05-14T01:45:27.530Z 后台页面校验：取消订单后台仍可查询：找到订单 ORD-353bd865-f848-4145-a0d0-0dfb992dedfa
- ✅ 2026-05-14T01:45:28.915Z 页面点击：快速下单提交订单：按钮可见且非 disabled
- ✅ 2026-05-14T01:45:31.430Z 前台真人点击：商品详情立即购买并提交订单：{"id":424,"order_number":"ORD-292166d7-cbc8-46ae-84c8-4060df5583f4","order_status":"pending","payment_status":"pending","payment_method":"paypal","final_amount":50.14}
- ✅ 2026-05-14T01:45:31.441Z 数据库校验：订单 ORD-292166d7-cbc8-46ae-84c8-4060df5583f4 创建后 pending：{"id":424,"order_number":"ORD-292166d7-cbc8-46ae-84c8-4060df5583f4","order_status":"pending","payment_status":"pending","payment_method":"paypal","final_amount":50.14}
- ✅ 2026-05-14T01:45:31.441Z 日志文件校验：订单 ORD-292166d7-cbc8-46ae-84c8-4060df5583f4 创建：存在日志/trace：.next/trace
- ✅ 2026-05-14T01:45:33.247Z 后台页面校验：第二个快速下单订单进入后台：找到订单 ORD-292166d7-cbc8-46ae-84c8-4060df5583f4
- ✅ 2026-05-14T01:45:33.951Z 后台仪表盘页面校验：订单/用户/库存数据卡片存在：Reviews About Us Contact Us Today's Deals All Products Customization Flash Sale categories.all Teapots Cups Accessories Sets 🇺🇸 English E2E管理员 紫砂后台管理 Zisha Admin Console 数据看板 📊 今日概览 订单中心 🧾 全部订单 商品中心 📦 商品列表 🏷️ 商品分类 库存中心 🏬 库存总览 🔔 库存预警 ✅ 盘点任务 营销中心 🎯 促销规则 🎟️ 优惠券管理 支付中心 💳 支付配置 💸 支付流水 ↩️ 退款流水 📜 回调日志 用户中心 👥 用户列表 评价中心 ⭐ 商品评价 内容与风格 🏠 首页模块 ℹ️ 关于我们 📞 联系方式 🛡️ 服务保障 🎨 主题风格 🌐 多语言配置 系统设置 🔐 管理员权限 💱 汇率设置 🗂️ 审计日志 🗃️ 数据库检查 ⚙️ 系统配置 Admin / Dashboard OVERVIEW 管理控制台 基于真实订单、用户、商品和库存数据生成今日运营概览。 刷新
- ✅ 2026-05-14T01:45:36.813Z 后台订单详情区域校验：Reviews About Us Contact Us Today's Deals All Products Customization Flash Sale categories.all Teapots Cups Accessories Sets 🇺🇸 English E2E管理员 紫砂后台管理 Zisha Admin Console 数据看板 📊 今日概览 订单中心 🧾 全部订单 商品中心 📦 商品列表 🏷️ 商品分类 库存中心 🏬 库存总览 🔔 库存预警 ✅ 盘点任务 营销中心 🎯 促销规则 🎟️ 优惠券管理 支付中心 💳 支付配置 💸 支付流水 ↩️ 退款流水 📜 回调日志 用户中心 👥 用户列表 评价中心 ⭐ 商品评价 内容与风格 🏠 首页模块 ℹ️ 关于我们 📞 联系方式 🛡️ 服务保障 🎨 主题风格 🌐 多语言配置 系统设置 🔐 管理员权限 💱 汇率设置 🗂️ 审计日志 🗃️ 数据库检查 ⚙️ 系统配置 订单中心 统一处理订单查询、发货、退款审批和订单状态追踪，所有状态变更必须走后台状态机。 全部订单状态 待付款 待发货 待收
- ✅ 2026-05-14T01:45:36.853Z 页面会话触发：超时订单释放接口/权限保护校验：{"release":{"ok":true,"status":200,"data":{"success":true,"data":{"releasedOrders":0,"restoredItems":0,"details":[]}}},"expiredPending":0}
- ✅ 2026-05-14T01:45:36.897Z 测试后数据库快照：orders=422, reviews=211, created=ORD-8918766b-bd0e-4882-8e96-917af0e9ac21,ORD-353bd865-f848-4145-a0d0-0dfb992dedfa,ORD-292166d7-cbc8-46ae-84c8-4060df5583f4
