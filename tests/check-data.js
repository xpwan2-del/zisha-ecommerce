const db = require('./src/lib/db');

async function main() {
  // Find pending orders
  const orders = await db.query("SELECT id, order_number, order_status, final_amount, user_id FROM orders ORDER BY id DESC LIMIT 10");
  console.log('=== 最近订单 ===');
  for (const o of orders.rows) {
    console.log(`  id=${o.id} number=${o.order_number} status=${o.order_status} final=${o.final_amount} user=${o.user_id}`);
  }

  // Find active coupons
  const coupons = await db.query("SELECT id, name, code, type, value, is_active, is_stackable FROM coupons LIMIT 10");
  console.log('\n=== 优惠券 ===');
  for (const c of coupons.rows) {
    console.log(`  id=${c.id} name=${c.name} code=${c.code} type=${c.type} value=${c.value} active=${c.is_active} stackable=${c.is_stackable}`);
  }

  // Find user_coupons
  const uc = await db.query("SELECT uc.id, uc.user_id, uc.coupon_id, uc.status, c.name, c.code FROM user_coupons uc JOIN coupons c ON uc.coupon_id = c.id LIMIT 10");
  console.log('\n=== 用户优惠券 ===');
  for (const u of uc.rows) {
    console.log(`  id=${u.id} user=${u.user_id} coupon=${u.coupon_id} status=${u.status} name=${u.name} code=${u.code}`);
  }

  // Find addresses
  const addrs = await db.query("SELECT id, user_id, contact_name, city, country_name FROM addresses LIMIT 10");
  console.log('\n=== 地址 ===');
  for (const a of addrs.rows) {
    console.log(`  id=${a.id} user=${a.user_id} name=${a.contact_name} city=${a.city} country=${a.country_name}`);
  }

  // Check order_items
  const items = await db.query("SELECT id, order_id, product_id, product_name, quantity, unit_price FROM order_items ORDER BY id DESC LIMIT 5");
  console.log('\n=== 订单商品 ===');
  for (const i of items.rows) {
    console.log(`  id=${i.id} order=${i.order} product=${i.product_id} name=${i.product_name} qty=${i.quantity} price=${i.unit_price}`);
  }

  // Check products with inventory
  const prods = await db.query("SELECT p.id, p.name, p.price, COALESCE(i.quantity, 0) as stock FROM products p LEFT JOIN inventory i ON p.id = i.product_id WHERE i.quantity > 0 LIMIT 5");
  console.log('\n=== 有库存商品 ===');
  for (const p of prods.rows) {
    console.log(`  id=${p.id} name=${p.name} price=${p.price} stock=${p.stock}`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
