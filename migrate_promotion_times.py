import sqlite3

DB_PATH = 'src/lib/db/database.sqlite'

# 原始时间数据（从promotions表删除前的数据）
PROMOTION_TIMES = {
    1: {'start_time': '2026-04-09 00:00:00', 'end_time': '2026-04-11 12:00:00'},  # 今日特惠
    2: {'start_time': '2026-04-09 00:00:00', 'end_time': '2026-04-12 12:00:00'},  # 特惠商品
    3: {'start_time': '2026-04-01 00:00:00', 'end_time': '2026-04-30 23:59:59'},  # 春季促销
    4: {'start_time': '2026-04-10 00:00:00', 'end_time': '2026-04-20 23:59:59'},  # 紫砂壶特惠
    5: {'start_time': '2026-04-01 00:00:00', 'end_time': '2026-04-30 23:59:59'},  # 新品上市
    6: {'start_time': '2026-04-15 00:00:00', 'end_time': '2026-04-25 23:59:59'},  # 茶杯专场
    7: {'start_time': '2026-04-05 00:00:00', 'end_time': '2026-04-15 23:59:59'},  # 茶具套装
}

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# 更新每个产品-促销关联的时间
for promo_id, times in PROMOTION_TIMES.items():
    cursor.execute("""
        UPDATE product_promotions 
        SET start_time = ?, end_time = ?
        WHERE promotion_id = ?
    """, (times['start_time'], times['end_time'], promo_id))
    print(f"Updated promotion {promo_id}: {times['start_time']} to {times['end_time']}")

conn.commit()

# 验证更新
print("\n=== 验证更新结果 ===")
cursor.execute("SELECT product_id, promotion_id, start_time, end_time FROM product_promotions LIMIT 10")
for row in cursor.fetchall():
    print(f"Product {row[0]}, Promo {row[1]}: {row[2]} - {row[3]}")

conn.close()
print("\n完成！")