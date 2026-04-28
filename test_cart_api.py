#!/usr/bin/env python3
import requests
import json
import time

BASE_URL = "http://localhost:3000/api"

def login(email, password):
    response = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if response.ok:
        data = response.json()
        return data.get("access_token")
    return None

def get_cart(token):
    response = requests.get(f"{BASE_URL}/cart", headers={"Authorization": f"Bearer {token}"})
    if response.ok:
        return response.json()
    return None

def add_to_cart(token, product_id, quantity):
    response = requests.post(
        f"{BASE_URL}/cart",
        json={"product_id": product_id, "quantity": quantity},
        headers={"Authorization": f"Bearer {token}"}
    )
    time.sleep(0.5)  # 等待数据库写入
    return response.status_code, response.json()

def update_cart(token, cart_item_id, quantity):
    response = requests.put(
        f"{BASE_URL}/cart",
        json={"id": cart_item_id, "quantity": quantity},
        headers={"Authorization": f"Bearer {token}"}
    )
    time.sleep(0.5)  # 等待数据库写入
    return response.status_code, response.json()

def delete_cart(token, cart_item_id):
    response = requests.delete(
        f"{BASE_URL}/cart?id={cart_item_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    time.sleep(0.5)  # 等待数据库写入
    return response.status_code, response.json()

def get_db_state():
    import sqlite3
    conn = sqlite3.connect("/Users/davis/zisha-ecommerce/src/lib/db/database.sqlite")
    cursor = conn.cursor()
    cursor.execute("SELECT product_id, quantity FROM inventory WHERE product_id IN (1,2,3,4)")
    inventory = {row[0]: row[1] for row in cursor.fetchall()}
    cursor.execute("SELECT product_id, quantity FROM cart_items WHERE user_id = 10")  # 用户10
    user1_cart = {row[0]: row[1] for row in cursor.fetchall()}
    cursor.execute("SELECT product_id, quantity FROM cart_items WHERE user_id = 11")  # 用户11
    user8_cart = {row[0]: row[1] for row in cursor.fetchall()}
    conn.close()
    return inventory, user1_cart, user8_cart

def print_state(inv, u1, u2, product_id=1):
    s1 = u1.get(product_id, 0)
    s2 = u2.get(product_id, 0)
    total = inv.get(product_id, 0) + s1 + s2
    print(f"  库存={inv.get(product_id, 0)}, 用户1={s1}, 用户2={s2}, 总计={total}")

def reset_db():
    import sqlite3
    conn = sqlite3.connect("/Users/davis/zisha-ecommerce/src/lib/db/database.sqlite")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cart_items")  # 清空所有购物车
    cursor.execute("UPDATE inventory SET quantity = 10 WHERE product_id IN (1,2,3,4)")
    cursor.execute("DELETE FROM inventory_transactions WHERE product_id IN (1,2,3,4)")
    conn.commit()
    conn.close()
    print("[数据库已重置]")

def main():
    print("=== 登录 ===")
    token1 = login("testuser1new@example.com", "password123")  # 用户10
    token8 = login("testuser2new@example.com", "password123")  # 用户11
    print(f"用户1(token1): {'成功' if token1 else '失败'}")
    print(f"用户2(token8): {'成功' if token8 else '失败'}")

    print("\n" + "="*50)
    print("TC-001: 用户1加入商品1×1")
    print("="*50)
    reset_db()
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)
    code, resp = add_to_cart(token1, 1, 1)
    print(f"API: {code} - {resp.get('success') or resp.get('error')}")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)
    print("预期: 库存=9, 用户1=1, 总计=10")

    print("\n" + "="*50)
    print("TC-002: 用户1再加入商品1×1")
    print("="*50)
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)
    code, resp = add_to_cart(token1, 1, 1)
    print(f"API: {code} - {resp.get('success') or resp.get('error')}")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)
    print("预期: 库存=8, 用户1=2, 总计=10")

    print("\n" + "="*50)
    print("TC-003: 用户1再加入商品1×1")
    print("="*50)
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)
    code, resp = add_to_cart(token1, 1, 1)
    print(f"API: {code} - {resp.get('success') or resp.get('error')}")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)
    print("预期: 库存=7, 用户1=3, 总计=10")

    print("\n" + "="*50)
    print("TC-004: 用户1加入商品2×1")
    print("="*50)
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 2)
    code, resp = add_to_cart(token1, 2, 1)
    print(f"API: {code} - {resp.get('success') or resp.get('error')}")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 2)
    print("预期: 库存=9, 用户1=1, 总计=10")

    print("\n" + "="*50)
    print("TC-005: 用户1PUT商品1: 3→5")
    print("="*50)
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)
    cart = get_cart(token1)
    item_id = None
    for item in cart.get("data", {}).get("items", []):
        if item.get("product_id") == 1:
            item_id = item.get("id")
            break
    if item_id:
        code, resp = update_cart(token1, item_id, 5)
        print(f"API: {code} - {resp.get('success') or resp.get('error')}")
        inv, u1, u2 = get_db_state()
        print_state(inv, u1, u2, 1)
        print("预期: 库存=5, 用户1=5, 总计=10")

    print("\n" + "="*50)
    print("TC-006: 用户1PUT商品1: 5→2")
    print("="*50)
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)
    if item_id:
        code, resp = update_cart(token1, item_id, 2)
        print(f"API: {code} - {resp.get('success') or resp.get('error')}")
        inv, u1, u2 = get_db_state()
        print_state(inv, u1, u2, 1)
        print("预期: 库存=8, 用户1=2, 总计=10")

    print("\n" + "="*50)
    print("TC-007: 用户1删除商品2")
    print("="*50)
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 2)
    cart = get_cart(token1)
    item_id2 = None
    for item in cart.get("data", {}).get("items", []):
        if item.get("product_id") == 2:
            item_id2 = item.get("id")
            break
    if item_id2:
        code, resp = delete_cart(token1, item_id2)
        print(f"API: {code} - {resp.get('success') or resp.get('error')}")
        inv, u1, u2 = get_db_state()
        print_state(inv, u1, u2, 2)
        print("预期: 库存=10, 用户1=0, 总计=10")

    print("\n" + "="*50)
    print("TC-008: 用户1DELETE删除商品1")
    print("="*50)
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)
    cart = get_cart(token1)
    item_id = None
    for item in cart.get("data", {}).get("items", []):
        if item.get("product_id") == 1:
            item_id = item.get("id")
            break
    if item_id:
        code, resp = delete_cart(token1, item_id)
        print(f"API: {code} - {resp.get('success') or resp.get('error')}")
        inv, u1, u2 = get_db_state()
        print_state(inv, u1, u2, 1)
        print("预期: 库存=10, 用户1=0, 总计=10")

    print("\n" + "="*50)
    print("TC-009: 用户2加入商品1×1")
    print("="*50)
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)
    code, resp = add_to_cart(token8, 1, 1)
    print(f"API: {code} - {resp.get('success') or resp.get('error')}")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)
    print("预期: 库存=9, 用户1=0, 用户2=1, 总计=10")

    print("\n" + "="*50)
    print("TC-010: 用户2再加入商品1×1")
    print("="*50)
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)
    code, resp = add_to_cart(token8, 1, 1)
    print(f"API: {code} - {resp.get('success') or resp.get('error')}")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)
    print("预期: 库存=8, 用户1=0, 用户2=2, 总计=10")

    print("\n" + "="*50)
    print("TC-011: 用户2加入商品3×1")
    print("="*50)
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 3)
    code, resp = add_to_cart(token8, 3, 1)
    print(f"API: {code} - {resp.get('success') or resp.get('error')}")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 3)
    print("预期: 库存=9, 用户1=0, 用户2=1, 总计=10")

    print("\n" + "="*50)
    print("TC-012: 两用户同时操作商品1")
    print("="*50)
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)
    print("  用户1加入商品1×1...")
    code1, resp1 = add_to_cart(token1, 1, 1)
    print(f"    API: {code1}")
    print("  用户2加入商品1×1...")
    code2, resp2 = add_to_cart(token8, 1, 1)
    print(f"    API: {code2}")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)
    print("预期: 库存=6, 用户1=1, 用户2=3, 总计=10")

    print("\n" + "="*50)
    print("TC-013: 库存边界测试")
    print("="*50)
    import sqlite3
    conn = sqlite3.connect("/Users/davis/zisha-ecommerce/src/lib/db/database.sqlite")
    conn.execute("UPDATE inventory SET quantity = 1 WHERE product_id = 2")
    conn.execute("DELETE FROM cart_items WHERE user_id = 1")
    conn.commit()
    conn.close()
    print("设置: 商品2库存=1, 用户1购物车=0")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 2)
    code, resp = add_to_cart(token1, 2, 1)
    print(f"API: {code} - {resp.get('success') or resp.get('error')}")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 2)
    print("预期: 库存=0, 用户1=1, 总计=1")

    print("\n" + "="*50)
    print("TC-014: 库存为0时拒绝")
    print("="*50)
    print("当前: 商品2库存=0, 用户1购物车=1")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 2)
    print("尝试再加入商品2×1...")
    code, resp = add_to_cart(token1, 2, 1)
    print(f"API: {code} - {resp.get('success') or resp.get('error')}")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 2)
    print("预期: 库存=0, 用户1=1, 总计=1 (拒绝)")

    print("\n" + "="*50)
    print("TC-015: 用户2PUT增加数量")
    print("="*50)
    conn = sqlite3.connect("/Users/davis/zisha-ecommerce/src/lib/db/database.sqlite")
    conn.execute("UPDATE inventory SET quantity = 8 WHERE product_id = 1")
    conn.execute("DELETE FROM cart_items WHERE user_id = 8")
    conn.execute("INSERT INTO cart_items (user_id, product_id, quantity) VALUES (8, 1, 2)")
    conn.commit()
    conn.close()
    print("设置: 商品1库存=8, 用户2购物车=2")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)
    cart = get_cart(token8)
    item_id = None
    for item in cart.get("data", {}).get("items", []):
        if item.get("product_id") == 1:
            item_id = item.get("id")
            break
    if item_id:
        code, resp = update_cart(token8, item_id, 3)
        print(f"API: {code} - {resp.get('success') or resp.get('error')}")
        inv, u1, u2 = get_db_state()
        print_state(inv, u1, u2, 1)
        print("预期: 库存=7, 用户1=0, 用户2=3, 总计=10")

    print("\n" + "="*50)
    print("TC-016: 用户2PUT减少数量")
    print("="*50)
    print("当前: 商品1库存=7, 用户2购物车=3")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)
    if item_id:
        code, resp = update_cart(token8, item_id, 1)
        print(f"API: {code} - {resp.get('success') or resp.get('error')}")
        inv, u1, u2 = get_db_state()
        print_state(inv, u1, u2, 1)
        print("预期: 库存=9, 用户1=0, 用户2=1, 总计=10")

    print("\n" + "="*50)
    print("TC-017: 用户2删除商品3")
    print("="*50)
    conn = sqlite3.connect("/Users/davis/zisha-ecommerce/src/lib/db/database.sqlite")
    conn.execute("UPDATE inventory SET quantity = 9 WHERE product_id = 3")
    conn.execute("DELETE FROM cart_items WHERE user_id = 8")
    conn.execute("INSERT INTO cart_items (user_id, product_id, quantity) VALUES (8, 3, 1)")
    conn.commit()
    conn.close()
    print("设置: 商品3库存=9, 用户2购物车=1")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 3)
    cart = get_cart(token8)
    item_id3 = None
    for item in cart.get("data", {}).get("items", []):
        if item.get("product_id") == 3:
            item_id3 = item.get("id")
            break
    if item_id3:
        code, resp = delete_cart(token8, item_id3)
        print(f"API: {code} - {resp.get('success') or resp.get('error')}")
        inv, u1, u2 = get_db_state()
        print_state(inv, u1, u2, 3)
        print("预期: 库存=10, 用户1=0, 用户2=0, 总计=10")

    print("\n" + "="*50)
    print("TC-018: 超库存PUT测试")
    print("="*50)
    conn = sqlite3.connect("/Users/davis/zisha-ecommerce/src/lib/db/database.sqlite")
    conn.execute("UPDATE inventory SET quantity = 0 WHERE product_id = 4")
    conn.execute("DELETE FROM cart_items WHERE user_id = 1")
    conn.execute("INSERT INTO cart_items (user_id, product_id, quantity) VALUES (1, 4, 10)")
    conn.commit()
    conn.close()
    print("设置: 商品4库存=0, 用户1购物车=10")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 4)
    cart = get_cart(token1)
    item_id4 = None
    for item in cart.get("data", {}).get("items", []):
        if item.get("product_id") == 4:
            item_id4 = item.get("id")
            break
    if item_id4:
        print("尝试PUT商品4: 10→11...")
        code, resp = update_cart(token1, item_id4, 11)
        print(f"API: {code} - {resp.get('success') or resp.get('error')}")
        inv, u1, u2 = get_db_state()
        print_state(inv, u1, u2, 4)
        print("预期: 库存=0, 用户1=10, 总计=10 (拒绝)")

    print("\n" + "="*50)
    print("TC-019: 复杂场景-用户1连续操作")
    print("="*50)
    reset_db()
    print("初始: 库存=10, 用户1购物车=0")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)

    print("Step1: 加入商品1×1")
    code, resp = add_to_cart(token1, 1, 1)
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)

    print("Step2: 再加入商品1×1")
    code, resp = add_to_cart(token1, 1, 1)
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)

    print("Step3: 修改商品1为3")
    cart = get_cart(token1)
    item_id = None
    for item in cart.get("data", {}).get("items", []):
        if item.get("product_id") == 1:
            item_id = item.get("id")
            break
    if item_id:
        code, resp = update_cart(token1, item_id, 3)
        inv, u1, u2 = get_db_state()
        print_state(inv, u1, u2, 1)

    print("Step4: 删除商品1")
    if item_id:
        code, resp = delete_cart(token1, item_id)
        inv, u1, u2 = get_db_state()
        print_state(inv, u1, u2, 1)
    print("预期最终: 库存=10, 用户1=0, 总计=10")

    print("\n" + "="*50)
    print("TC-020: 复杂场景-两用户交叉操作")
    print("="*50)
    reset_db()
    print("初始: 库存=10, 用户1=0, 用户2=0")
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)

    print("Step1: 用户1加入商品1×1")
    code, resp = add_to_cart(token1, 1, 1)
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)

    print("Step2: 用户2加入商品1×1")
    code, resp = add_to_cart(token8, 1, 1)
    inv, u1, u2 = get_db_state()
    print_state(inv, u1, u2, 1)

    print("Step3: 用户1PUT商品1: 1→2")
    cart1 = get_cart(token1)
    item1_id = None
    for item in cart1.get("data", {}).get("items", []):
        if item.get("product_id") == 1:
            item1_id = item.get("id")
            break
    if item1_id:
        code, resp = update_cart(token1, item1_id, 2)
        inv, u1, u2 = get_db_state()
        print_state(inv, u1, u2, 1)

    print("Step4: 用户2删除商品1")
    cart8 = get_cart(token8)
    item8_id = None
    for item in cart8.get("data", {}).get("items", []):
        if item.get("product_id") == 1:
            item8_id = item.get("id")
            break
    if item8_id:
        code, resp = delete_cart(token8, item8_id)
        inv, u1, u2 = get_db_state()
        print_state(inv, u1, u2, 1)

    print("Step5: 用户1删除商品1")
    if item1_id:
        code, resp = delete_cart(token1, item1_id)
        inv, u1, u2 = get_db_state()
        print_state(inv, u1, u2, 1)
    print("预期最终: 库存=10, 用户1=0, 用户2=0, 总计=10")

    print("\n" + "="*50)
    print("测试完成!")
    print("="*50)

if __name__ == "__main__":
    main()
