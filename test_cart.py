#!/usr/bin/env python3
import sqlite3
import random

DB_PATH = "/Users/davis/zisha-ecommerce/src/lib/db/database.sqlite"

def get_stock(conn, product_id):
    cursor = conn.execute("SELECT quantity FROM inventory WHERE product_id = ?", (product_id,))
    result = cursor.fetchone()
    return result[0] if result else 0

def get_cart_total(conn, product_id):
    cursor = conn.execute("SELECT COALESCE(SUM(quantity), 0) FROM cart_items WHERE product_id = ?", (product_id,))
    return cursor.fetchone()[0]

def get_user_cart(conn, user_id, product_id):
    cursor = conn.execute("SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?", (user_id, product_id))
    result = cursor.fetchone()
    return result[0] if result else 0

conn = sqlite3.connect(DB_PATH)

conn.execute("DELETE FROM cart_items WHERE user_id BETWEEN 1 AND 10")
conn.execute("UPDATE inventory SET quantity = 10 WHERE product_id IN (1, 2)")
conn.commit()

print("=== 50轮大规模测试开始 ===\n")

errors = 0
warnings = 0

for round_num in range(1, 51):
    for op_num in range(20):
        user_id = random.randint(1, 10)
        product_id = random.randint(1, 2)
        action = random.randint(0, 3)

        if action == 0:
            existing = get_user_cart(conn, user_id, product_id)
            stock = get_stock(conn, product_id)
            new_quantity = existing + 1

            if new_quantity <= stock:
                try:
                    conn.execute("INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, 1)", (user_id, product_id))
                except:
                    conn.execute("UPDATE cart_items SET quantity = quantity + 1 WHERE user_id = ? AND product_id = ?", (user_id, product_id))
                conn.execute("UPDATE inventory SET quantity = quantity - 1 WHERE product_id = ?", (product_id,))
                conn.commit()

        elif action == 1:
            existing = get_user_cart(conn, user_id, product_id)
            stock = get_stock(conn, product_id)
            new_quantity = existing + 1

            if existing > 0 and new_quantity <= stock:
                conn.execute("UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?", (new_quantity, user_id, product_id))
                conn.execute("UPDATE inventory SET quantity = quantity - 1 WHERE product_id = ?", (product_id,))
                conn.commit()

        elif action == 2:
            existing = get_user_cart(conn, user_id, product_id)
            if existing > 0:
                new_quantity = existing - 1
                if new_quantity == 0:
                    conn.execute("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?", (user_id, product_id))
                else:
                    conn.execute("UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?", (new_quantity, user_id, product_id))
                conn.execute("UPDATE inventory SET quantity = quantity + 1 WHERE product_id = ?", (product_id,))
                conn.commit()

        elif action == 3:
            existing = get_user_cart(conn, user_id, product_id)
            if existing > 0:
                conn.execute("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?", (user_id, product_id))
                conn.execute("UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?", (existing, product_id))
                conn.commit()

    p1_stock = get_stock(conn, 1)
    p2_stock = get_stock(conn, 2)
    p1_cart = get_cart_total(conn, 1)
    p2_cart = get_cart_total(conn, 2)

    if p1_stock < 0:
        print(f"错误轮{round_num}: 商品1库存为负 {p1_stock}")
        errors += 1
    if p2_stock < 0:
        print(f"错误轮{round_num}: 商品2库存为负 {p2_stock}")
        errors += 1
    if p1_stock + p1_cart != 20:
        warnings += 1
    if p2_stock + p2_cart != 20:
        warnings += 1

    if round_num % 10 == 0:
        print(f"完成 {round_num}/50 轮 - 商品1库存:{p1_stock} 购物车:{p1_cart} | 商品2库存:{p2_stock} 购物车:{p2_cart}")

conn.close()

print(f"\n=== 测试完成 ===")
print(f"总检查轮数: 50")
print(f"库存为负错误数: {errors}")
print(f"总数不一致警告: {warnings}")
print(f"结果: {'✅ 通过' if errors == 0 else '❌ 失败'}")
