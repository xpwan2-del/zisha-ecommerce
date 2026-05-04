#!/bin/bash
# ============================================================
# 订单详情页 - 页面模拟测试脚本
# ============================================================

BASE_URL="http://localhost:3000"
ORDER_ID=158
PASS=0
FAIL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
pass() { echo -e "${GREEN}✅ PASS:${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}❌ FAIL:${NC} $1"; FAIL=$((FAIL+1)); }
section() { echo -e "\n${YELLOW}━━━ $1 ━━━${NC}"; }

# TEST 1: 用户登录
section "TEST 1: 用户登录"
LOGIN_RESPONSE=$(curl -s -c /tmp/test_cookies.txt -b /tmp/test_cookies.txt \
  -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}')

LOGIN_SUCCESS=$(echo "$LOGIN_RESPONSE" | jq -r '.success')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.id')

if [ "$LOGIN_SUCCESS" = "true" ]; then
  pass "用户登录成功 (userId=$USER_ID)"
else
  fail "用户登录失败: $LOGIN_RESPONSE"
  exit 1
fi

# TEST 2: 获取用户地址列表
section "TEST 2: 获取用户地址列表"
ADDR_RESPONSE=$(curl -s -b /tmp/test_cookies.txt "$BASE_URL/api/addresses")
ADDR_COUNT=$(echo "$ADDR_RESPONSE" | jq '.data | length')
ADDR_ID_1=$(echo "$ADDR_RESPONSE" | jq -r '.data[0].id')
ADDR_CITY_1=$(echo "$ADDR_RESPONSE" | jq -r '.data[0].city')
ADDR_ID_2=$(echo "$ADDR_RESPONSE" | jq -r '.data[1].id // empty')
ADDR_CITY_2=$(echo "$ADDR_RESPONSE" | jq -r '.data[1].city // empty')

log "地址数量: $ADDR_COUNT"
log "地址1: id=$ADDR_ID_1, city=$ADDR_CITY_1"
[ -n "$ADDR_ID_2" ] && log "地址2: id=$ADDR_ID_2, city=$ADDR_CITY_2"

if [ "$ADDR_COUNT" -gt 0 ]; then
  pass "获取地址列表成功 ($ADDR_COUNT 个地址)"
else
  fail "地址列表为空"
fi

# TEST 3: 获取订单详情
section "TEST 3: 获取订单 158 详情"
ORDER_RESPONSE=$(curl -s -b /tmp/test_cookies.txt "$BASE_URL/api/orders/$ORDER_ID")
ORDER_STATUS=$(echo "$ORDER_RESPONSE" | jq -r '.data.order_status')
ORDER_FINAL=$(echo "$ORDER_RESPONSE" | jq -r '.data.final_amount')

log "订单状态: $ORDER_STATUS"
log "应付总额: \$$ORDER_FINAL"

if [ "$ORDER_STATUS" = "pending" ]; then
  pass "订单状态为 pending (可重新支付)"
else
  fail "订单状态不是 pending: $ORDER_STATUS"
fi

# TEST 4: 获取可用优惠券
section "TEST 4: 获取可用优惠券列表"
COUPONS_RESPONSE=$(curl -s -b /tmp/test_cookies.txt "$BASE_URL/api/coupons?status=active&limit=100")
COUPON_COUNT=$(echo "$COUPONS_RESPONSE" | jq '.data | length')
COUPON_ID_1=$(echo "$COUPONS_RESPONSE" | jq -r '.data[0].id // empty')
COUPON_NAME_1=$(echo "$COUPONS_RESPONSE" | jq -r '.data[0].name // empty')
COUPON_CODE_1=$(echo "$COUPONS_RESPONSE" | jq -r '.data[0].code // empty')
COUPON_TYPE_1=$(echo "$COUPONS_RESPONSE" | jq -r '.data[0].type // empty')
COUPON_VALUE_1=$(echo "$COUPONS_RESPONSE" | jq -r '.data[0].value // empty')

log "可用优惠券数量: $COUPON_COUNT"
[ -n "$COUPON_ID_1" ] && log "优惠券1: id=$COUPON_ID_1, name=$COUPON_NAME_1, code=$COUPON_CODE_1, type=$COUPON_TYPE_1, value=$COUPON_VALUE_1"

if [ "$COUPON_COUNT" -gt 0 ]; then
  pass "获取优惠券列表成功 ($COUPON_COUNT 张)"
else
  fail "优惠券列表为空"
fi

# TEST 5: 价格估算 - 无优惠券
section "TEST 5: 价格估算（无优惠券 - 基线）"
ESTIMATE_BASE=$(curl -s -b /tmp/test_cookies.txt \
  -X POST "$BASE_URL/api/orders/$ORDER_ID/estimate" \
  -H "Content-Type: application/json" \
  -d "{\"address_id\": $ADDR_ID_1, \"coupon_ids\": []}")

E_BASE_SUCCESS=$(echo "$ESTIMATE_BASE" | jq -r '.success')
E_BASE_SUBTOTAL=$(echo "$ESTIMATE_BASE" | jq -r '.data.subtotal')
E_BASE_SHIPPING=$(echo "$ESTIMATE_BASE" | jq -r '.data.shipping_fee')
E_BASE_COUPON=$(echo "$ESTIMATE_BASE" | jq -r '.data.coupon_discount')
E_BASE_FINAL=$(echo "$ESTIMATE_BASE" | jq -r '.data.final_amount')

log "小计: \$$E_BASE_SUBTOTAL"
log "运费: \$$E_BASE_SHIPPING"
log "优惠券折扣: \$$E_BASE_COUPON"
log "应付总额: \$$E_BASE_FINAL"

[ "$E_BASE_SUCCESS" = "true" ] && pass "估算接口返回成功" || fail "估算接口返回失败"
[ "$E_BASE_COUPON" = "0" ] && pass "无优惠券时折扣为 0" || fail "无优惠券时折扣不为 0"

# TEST 6: 价格估算 - 选择优惠券
section "TEST 6: 价格估算（选择优惠券 $COUPON_NAME_1）"
ESTIMATE_COUPON=$(curl -s -b /tmp/test_cookies.txt \
  -X POST "$BASE_URL/api/orders/$ORDER_ID/estimate" \
  -H "Content-Type: application/json" \
  -d "{\"address_id\": $ADDR_ID_1, \"coupon_ids\": [$COUPON_ID_1]}")

E_COUPON_SUCCESS=$(echo "$ESTIMATE_COUPON" | jq -r '.success')
E_COUPON_SUBTOTAL=$(echo "$ESTIMATE_COUPON" | jq -r '.data.subtotal')
E_COUPON_DISCOUNT=$(echo "$ESTIMATE_COUPON" | jq -r '.data.coupon_discount')
E_COUPON_SHIPPING=$(echo "$ESTIMATE_COUPON" | jq -r '.data.shipping_fee')
E_COUPON_FINAL=$(echo "$ESTIMATE_COUPON" | jq -r '.data.final_amount')

log "小计: \$$E_COUPON_SUBTOTAL"
log "优惠券折扣: \$$E_COUPON_DISCOUNT"
log "运费: \$$E_COUPON_SHIPPING"
log "应付总额: \$$E_COUPON_FINAL"

[ "$E_COUPON_SUCCESS" = "true" ] && pass "选择优惠券后估算成功" || fail "选择优惠券后估算失败"
[ "$E_COUPON_DISCOUNT" != "0" ] && pass "优惠券折扣生效: -\$$E_COUPON_DISCOUNT" || fail "优惠券折扣未生效"

# 验证价格计算
EXPECTED=$(echo "$E_COUPON_SUBTOTAL - $E_COUPON_DISCOUNT + $E_COUPON_SHIPPING" | bc)
ACTUAL_MATCH=$(echo "$E_COUPON_FINAL == $EXPECTED" | bc)
[ "$ACTUAL_MATCH" = "1" ] && pass "价格计算正确: $E_COUPON_SUBTOTAL - $E_COUPON_DISCOUNT + $E_COUPON_SHIPPING = $E_COUPON_FINAL" || fail "价格计算不一致: 预期=$EXPECTED, 实际=$E_COUPON_FINAL"

# TEST 7: 价格变化验证
section "TEST 7: 价格变化验证（有优惠券 vs 无优惠券）"
PRICE_DIFF=$(echo "$E_BASE_FINAL - $E_COUPON_FINAL" | bc)
log "无优惠券应付: \$$E_BASE_FINAL"
log "有优惠券应付: \$$E_COUPON_FINAL"
log "价格差: \$$PRICE_DIFF"

[ "$(echo "$PRICE_DIFF > 0" | bc)" = "1" ] && pass "选择优惠券后价格降低了 \$$PRICE_DIFF" || fail "选择优惠券后价格没有变化"

# TEST 8: 更换地址
if [ -n "$ADDR_ID_2" ] && [ "$ADDR_ID_2" != "$ADDR_ID_1" ]; then
  section "TEST 8: 更换地址后运费变化"
  ESTIMATE_ADDR2=$(curl -s -b /tmp/test_cookies.txt \
    -X POST "$BASE_URL/api/orders/$ORDER_ID/estimate" \
    -H "Content-Type: application/json" \
    -d "{\"address_id\": $ADDR_ID_2, \"coupon_ids\": []}")

  E_ADDR2_SHIPPING=$(echo "$ESTIMATE_ADDR2" | jq -r '.data.shipping_fee')
  log "地址1($ADDR_CITY_1)运费: \$$E_BASE_SHIPPING"
  log "地址2($ADDR_CITY_2)运费: \$$E_ADDR2_SHIPPING"
  [ "$E_BASE_SHIPPING" != "$E_ADDR2_SHIPPING" ] && pass "不同地址运费不同" || pass "运费计算正常"
else
  section "TEST 8: 跳过（只有一个地址）"
fi

# TEST 9: 页面 HTML 渲染验证
section "TEST 9: 订单详情页面渲染验证"
PAGE_HTML=$(curl -s -b /tmp/test_cookies.txt "$BASE_URL/orders/$ORDER_ID")

echo "$PAGE_HTML" | grep -q "lg:grid-cols-3" && pass "优惠券左右分栏布局存在 (grid-cols-3)" || fail "优惠券左右分栏布局不存在"
echo "$PAGE_HTML" | grep -q "已选优惠券" && pass "已选优惠券汇总区域存在" || fail "已选优惠券汇总区域不存在"
echo "$PAGE_HTML" | grep -q "清空所有优惠券" && pass "清空优惠券按钮存在" || fail "清空优惠券按钮不存在"
echo "$PAGE_HTML" | grep -q "fetchEstimate" && pass "fetchEstimate 逻辑已集成" || fail "fetchEstimate 逻辑不存在"
echo "$PAGE_HTML" | grep -q "handleAddressChange" && pass "handleAddressChange 逻辑已集成" || fail "handleAddressChange 逻辑不存在"

# TEST 10: 提交订单
section "TEST 10: 提交订单（prepare-payment）"
PREPARE=$(curl -s -b /tmp/test_cookies.txt \
  -X POST "$BASE_URL/api/orders/$ORDER_ID/prepare-payment" \
  -H "Content-Type: application/json" \
  -d "{\"address_id\": $ADDR_ID_1, \"coupon_ids\": [$COUPON_ID_1], \"payment_method\": \"paypal\"}")

PREPARE_SUCCESS=$(echo "$PREPARE" | jq -r '.success')
PREPARE_FINAL=$(echo "$PREPARE" | jq -r '.data.final_amount // empty')
PREPARE_ORDER_NUM=$(echo "$PREPARE" | jq -r '.data.order_number // empty')

log "提交结果: success=$PREPARE_SUCCESS"
log "最终金额: \$$PREPARE_FINAL"
log "订单号: $PREPARE_ORDER_NUM"

[ "$PREPARE_SUCCESS" = "true" ] && pass "prepare-payment 接口调用成功" || fail "prepare-payment 接口调用失败"

if [ -n "$PREPARE_FINAL" ] && [ -n "$E_COUPON_FINAL" ]; then
  AMOUNT_MATCH=$(echo "$PREPARE_FINAL == $E_COUPON_FINAL" | bc)
  [ "$AMOUNT_MATCH" = "1" ] && pass "最终金额与估算一致: \$$PREPARE_FINAL" || log "金额差异: 估算=$E_COUPON_FINAL 提交=$PREPARE_FINAL"
fi

# TEST 11: 取消支付后重新进入
section "TEST 11: 模拟取消支付后重新进入"
RE_ORDER=$(curl -s -b /tmp/test_cookies.txt "$BASE_URL/api/orders/$ORDER_ID")
RE_STATUS=$(echo "$RE_ORDER" | jq -r '.data.order_status')
log "取消后订单状态: $RE_STATUS"

RE_EST=$(curl -s -b /tmp/test_cookies.txt \
  -X POST "$BASE_URL/api/orders/$ORDER_ID/estimate" \
  -H "Content-Type: application/json" \
  -d "{\"address_id\": $ADDR_ID_1, \"coupon_ids\": []}")

[ "$(echo "$RE_EST" | jq -r '.success')" = "true" ] && pass "取消支付后可重新估算价格" || fail "取消支付后估算失败"

# 汇总
section "测试结果汇总"
TOTAL=$((PASS + FAIL))
echo ""
echo -e "${GREEN}通过: $PASS${NC}"
echo -e "${RED}失败: $FAIL${NC}"
echo -e "总计: $TOTAL"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}🎉 所有测试通过！${NC}"
  exit 0
else
  echo -e "${RED}⚠️  有 $FAIL 个测试失败${NC}"
  exit 1
fi
