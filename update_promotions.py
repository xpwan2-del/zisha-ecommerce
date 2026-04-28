import sqlite3

DB_PATH = 'src/lib/db/database.sqlite'

PROMOTION_STYLES = {
    '今日特惠': {'icon': 'fire', 'color': '#EF4444'},
    '特惠商品': {'icon': 'tag', 'color': '#DC2626'},
    '春季促销': {'icon': 'sparkles', 'color': '#CA8A04'},
    '紫砂壶特惠': {'icon': 'flame', 'color': '#B8860B'},
    '新品上市': {'icon': 'star', 'color': '#EF4444'},
    '茶杯专场': {'icon': 'cup', 'color': '#D4AF37'},
    '茶具套装': {'icon': 'gift', 'color': '#C59D3B'},
}

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("SELECT id, name FROM promotions")
promotions = cursor.fetchall()

for promo_id, promo_name in promotions:
    style = PROMOTION_STYLES.get(promo_name, {'icon': 'tag', 'color': '#CA8A04'})
    cursor.execute(
        "UPDATE promotions SET icon = ?, color = ? WHERE id = ?",
        (style['icon'], style['color'], promo_id)
    )
    print(f"Updated promotion {promo_id}: {promo_name} -> icon:{style['icon']}, color:{style['color']}")

conn.commit()
conn.close()

print("\n=== 验证更新结果 ===")
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("SELECT id, name, icon, color FROM promotions")
for row in cursor.fetchall():
    print(f"ID:{row[0]} | {row[1]} | icon:{row[2]} | color:{row[3]}")
conn.close()