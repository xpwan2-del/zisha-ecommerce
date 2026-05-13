# 页面级真人点击 E2E 测试报告

- 时间：2026-05-12T10:10:58.294Z
- 地址：http://localhost:3001
- 通过：26
- 失败：0
- 创建订单：242/ORD-4a4076fb-4a84-4576-b940-e887dd3ee5a1/pending, 243/ORD-5466d498-51c3-4a29-921a-810e5a6a2071/pending, 244/ORD-aa556b8b-45f6-4787-ac1f-b6ef5cf58c03/pending

## 明细

- ✅ 2026-05-12T10:10:24.651Z 测试前数据库快照：orders=239, reviews=187
- ✅ 2026-05-12T10:10:27.556Z 前台真人点击：用户登录：Reviews About Us Contact Us Today's Deals All Products Customization Flash Sale categories.all Teapots Cups Accessories Sets 🇺🇸 English Test User 2 T Test User 2 test2@example.com regular 0 积分 账户概览 订单管理 地址管理 收藏夹 优惠券 消息中心 个人设置 退出登录 账户概览 个人信息 姓名 Test User 2 邮箱 test2@example.com 电话 13800138001 角色 user 账户信息 会员等级 regular 积分 0 总消费 0 AED 推荐码 605C1F0FEE 最近订单 暂无订单记录 紫砂陶艺 为世界各地的茶爱好者提供正宗的中国紫砂陶艺，传承千年工艺，品味生活之美。 快速链接 Home Shop About Us Contact Us 产品分类 茶壶 茶杯 配件 套装 联系我们 info@zishapottery.com +86 123 4567 8910
- ✅ 2026-05-12T10:10:31.061Z 后台真人点击：admin 登录并进入仪表盘：Reviews About Us Contact Us Today's Deals All Products Customization Flash Sale categories.all Teapots Cups Accessories Sets 🇺🇸 English E2E管理员 紫砂后台管理 Zisha Admin Console 数据看板 📊 今日概览 订单中心 🧾 全部订单 商品中心 📦 商品列表 🏷️ 商品分类 库存中心 🏬 库存总览 🔔 库存预警 ✅ 盘点任务 营销中心 🎯 促销规则 🎟️ 优惠券管理 支付中心 💳 支付配置 💸 支付流水 ↩️ 退款流水 📜 回调日志 用户中心 👥 用户列表 评价中心 ⭐ 商品评价 内容与风格 🏠 首页模块 ℹ️ 关于我们 📞 联系方式 🛡️ 服务保障 🎨 主题风格 🌐 多语言配置 系统设置 🔐 管理员权限 💱 汇率设置 🗂️ 审计日志 🗃️ 数据库检查 ⚙️ 系统配置 Admin / Dashboard OVERVIEW 管理控制台 基于真实订单、用户、商品和库存数据生成今日运营概览。 刷新
- ✅ 2026-05-12T10:10:31.077Z 测试数据校验：可售商品：[{"id":1},{"id":2},{"id":3},{"id":4},{"id":5}]
- ✅ 2026-05-12T10:10:32.313Z 页面点击：快速下单提交订单：按钮可见且非 disabled
- ✅ 2026-05-12T10:10:34.834Z 前台真人点击：商品详情立即购买并提交订单：{"id":242,"order_number":"ORD-4a4076fb-4a84-4576-b940-e887dd3ee5a1","order_status":"pending","payment_status":"pending","payment_method":"paypal","final_amount":59.13}
- ✅ 2026-05-12T10:10:34.844Z 数据库校验：订单 ORD-4a4076fb-4a84-4576-b940-e887dd3ee5a1 创建后 pending：{"id":242,"order_number":"ORD-4a4076fb-4a84-4576-b940-e887dd3ee5a1","order_status":"pending","payment_status":"pending","payment_method":"paypal","final_amount":59.13}
- ✅ 2026-05-12T10:10:34.844Z 日志文件校验：订单 ORD-4a4076fb-4a84-4576-b940-e887dd3ee5a1 创建：存在日志/trace：.next/trace
- ✅ 2026-05-12T10:10:36.697Z 后台页面校验：快速下单订单进入后台：找到订单 ORD-4a4076fb-4a84-4576-b940-e887dd3ee5a1
- ✅ 2026-05-12T10:10:40.323Z 页面点击：购物车提交订单：按钮可见且非 disabled
- ✅ 2026-05-12T10:10:42.838Z 前台真人点击：加入购物车并结算：{"id":243,"order_number":"ORD-5466d498-51c3-4a29-921a-810e5a6a2071","order_status":"pending","payment_status":null,"payment_method":"paypal","final_amount":139.5}
- ✅ 2026-05-12T10:10:42.849Z 数据库校验：购物车订单 ORD-5466d498-51c3-4a29-921a-810e5a6a2071 创建后 pending：{"id":243,"order_number":"ORD-5466d498-51c3-4a29-921a-810e5a6a2071","order_status":"pending","payment_status":null,"payment_method":"paypal","final_amount":139.5}
- ✅ 2026-05-12T10:10:42.849Z 日志文件校验：购物车订单 ORD-5466d498-51c3-4a29-921a-810e5a6a2071 创建：存在日志/trace：.next/trace
- ✅ 2026-05-12T10:10:44.658Z 后台页面校验：购物车订单进入后台：找到订单 ORD-5466d498-51c3-4a29-921a-810e5a6a2071
- ✅ 2026-05-12T10:10:47.380Z 前台真人点击：取消订单：{"id":243,"order_number":"ORD-5466d498-51c3-4a29-921a-810e5a6a2071","order_status":"cancelled"}
- ✅ 2026-05-12T10:10:47.380Z 日志文件校验：取消订单 243：存在日志/trace：.next/trace
- ✅ 2026-05-12T10:10:49.175Z 后台页面校验：取消订单后台仍可查询：找到订单 ORD-5466d498-51c3-4a29-921a-810e5a6a2071
- ✅ 2026-05-12T10:10:50.366Z 页面点击：快速下单提交订单：按钮可见且非 disabled
- ✅ 2026-05-12T10:10:52.880Z 前台真人点击：商品详情立即购买并提交订单：{"id":244,"order_number":"ORD-aa556b8b-45f6-4787-ac1f-b6ef5cf58c03","order_status":"pending","payment_status":"pending","payment_method":"paypal","final_amount":50.14}
- ✅ 2026-05-12T10:10:52.890Z 数据库校验：订单 ORD-aa556b8b-45f6-4787-ac1f-b6ef5cf58c03 创建后 pending：{"id":244,"order_number":"ORD-aa556b8b-45f6-4787-ac1f-b6ef5cf58c03","order_status":"pending","payment_status":"pending","payment_method":"paypal","final_amount":50.14}
- ✅ 2026-05-12T10:10:52.890Z 日志文件校验：订单 ORD-aa556b8b-45f6-4787-ac1f-b6ef5cf58c03 创建：存在日志/trace：.next/trace
- ✅ 2026-05-12T10:10:54.677Z 后台页面校验：第二个快速下单订单进入后台：找到订单 ORD-aa556b8b-45f6-4787-ac1f-b6ef5cf58c03
- ✅ 2026-05-12T10:10:55.389Z 后台仪表盘页面校验：订单/用户/库存数据卡片存在：Reviews About Us Contact Us Today's Deals All Products Customization Flash Sale categories.all Teapots Cups Accessories Sets 🇺🇸 English E2E管理员 紫砂后台管理 Zisha Admin Console 数据看板 📊 今日概览 订单中心 🧾 全部订单 商品中心 📦 商品列表 🏷️ 商品分类 库存中心 🏬 库存总览 🔔 库存预警 ✅ 盘点任务 营销中心 🎯 促销规则 🎟️ 优惠券管理 支付中心 💳 支付配置 💸 支付流水 ↩️ 退款流水 📜 回调日志 用户中心 👥 用户列表 评价中心 ⭐ 商品评价 内容与风格 🏠 首页模块 ℹ️ 关于我们 📞 联系方式 🛡️ 服务保障 🎨 主题风格 🌐 多语言配置 系统设置 🔐 管理员权限 💱 汇率设置 🗂️ 审计日志 🗃️ 数据库检查 ⚙️ 系统配置 Admin / Dashboard OVERVIEW 管理控制台 基于真实订单、用户、商品和库存数据生成今日运营概览。 刷新
- ✅ 2026-05-12T10:10:58.211Z 后台订单详情区域校验：Reviews About Us Contact Us Today's Deals All Products Customization Flash Sale categories.all Teapots Cups Accessories Sets 🇺🇸 English E2E管理员 紫砂后台管理 Zisha Admin Console 数据看板 📊 今日概览 订单中心 🧾 全部订单 商品中心 📦 商品列表 🏷️ 商品分类 库存中心 🏬 库存总览 🔔 库存预警 ✅ 盘点任务 营销中心 🎯 促销规则 🎟️ 优惠券管理 支付中心 💳 支付配置 💸 支付流水 ↩️ 退款流水 📜 回调日志 用户中心 👥 用户列表 评价中心 ⭐ 商品评价 内容与风格 🏠 首页模块 ℹ️ 关于我们 📞 联系方式 🛡️ 服务保障 🎨 主题风格 🌐 多语言配置 系统设置 🔐 管理员权限 💱 汇率设置 🗂️ 审计日志 🗃️ 数据库检查 ⚙️ 系统配置 订单中心 统一处理订单查询、发货、退款审批和订单状态追踪，所有状态变更必须走后台状态机。 全部订单状态 待付款 待发货 待收
- ✅ 2026-05-12T10:10:58.246Z 页面会话触发：超时订单释放接口/权限保护校验：{"release":{"ok":true,"status":200,"data":{"success":true,"data":{"releasedOrders":0,"restoredItems":0,"details":[]}}},"expiredPending":0}
- ✅ 2026-05-12T10:10:58.294Z 测试后数据库快照：orders=242, reviews=187, created=ORD-4a4076fb-4a84-4576-b940-e887dd3ee5a1,ORD-5466d498-51c3-4a29-921a-810e5a6a2071,ORD-aa556b8b-45f6-4787-ac1f-b6ef5cf58c03
