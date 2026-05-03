#!/usr/bin/env python3
"""数据库外键约束迁移 - 修复版"""
import sqlite3
import shutil
from datetime import datetime

DB_PATH = '/Users/davis/zisha-ecommerce/src/lib/db/database.sqlite'
BACKUP_PATH = f'/Users/davis/zisha-ecommerce/src/lib/db/database-backup-fk2-{datetime.now().strftime("%Y%m%d_%H%M%S")}.sqlite'

shutil.copy2(DB_PATH, BACKUP_PATH)
print(f"✅ 备份已创建: {BACKUP_PATH}")

conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA foreign_keys = OFF")
conn.execute("PRAGMA journal_mode = DELETE")

MIGRATIONS = [
    {
        "name": "inventory",
        "new_sql": """CREATE TABLE inventory_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            product_name TEXT,
            quantity INTEGER DEFAULT 0,
            status_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )""",
        "cols": "id, product_id, product_name, quantity, status_id, created_at, updated_at"
    },
    {
        "name": "inventory_transactions",
        "new_sql": """CREATE TABLE inventory_transactions_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            quantity_change INTEGER NOT NULL,
            quantity_before INTEGER NOT NULL,
            quantity_after INTEGER NOT NULL,
            reason TEXT,
            reference_type VARCHAR(50),
            reference_id INTEGER,
            operator_id INTEGER,
            operator_name VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            transaction_type_id INTEGER,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            FOREIGN KEY (transaction_type_id) REFERENCES transaction_type(id) ON DELETE SET NULL,
            FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL
        )""",
        "cols": "id, product_id, product_name, quantity_change, quantity_before, quantity_after, reason, reference_type, reference_id, operator_id, operator_name, created_at, transaction_type_id"
    },
    {
        "name": "inventory_alerts",
        "new_sql": """CREATE TABLE inventory_alerts_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            alert_type VARCHAR(50) NOT NULL,
            current_stock INTEGER NOT NULL,
            threshold INTEGER NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            handled_by VARCHAR(100),
            handled_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            old_status VARCHAR(20),
            new_status VARCHAR(20),
            is_resolved INTEGER DEFAULT 0,
            resolved_at TIMESTAMP,
            resolution_note TEXT,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )""",
        "cols": "id, product_id, alert_type, current_stock, threshold, status, handled_by, handled_at, created_at, old_status, new_status, is_resolved, resolved_at, resolution_note"
    },
    {
        "name": "inventory_checks",
        "new_sql": """CREATE TABLE inventory_checks_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            check_number VARCHAR(50) UNIQUE NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            total_products INTEGER DEFAULT 0,
            profit_count INTEGER DEFAULT 0,
            loss_count INTEGER DEFAULT 0,
            profit_quantity INTEGER DEFAULT 0,
            loss_quantity INTEGER DEFAULT 0,
            operator_id INTEGER,
            operator_name VARCHAR(100),
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL
        )""",
        "cols": "id, check_number, status, total_products, profit_count, loss_count, profit_quantity, loss_quantity, operator_id, operator_name, completed_at, created_at, updated_at"
    },
    {
        "name": "orders",
        "new_sql": """CREATE TABLE orders_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            order_number TEXT UNIQUE,
            total_after_promotions_amount NUMERIC,
            total_original_price REAL,
            shipping_fee NUMERIC,
            order_final_discount_amount NUMERIC,
            payment_method TEXT,
            payment_status TEXT,
            order_status TEXT,
            shipping_address_id INTEGER,
            coupon_ids TEXT,
            total_coupon_discount REAL,
            final_amount NUMERIC,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reference_id VARCHAR(100),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (shipping_address_id) REFERENCES addresses(id) ON DELETE SET NULL
        )""",
        "cols": "id, user_id, order_number, total_after_promotions_amount, total_original_price, shipping_fee, order_final_discount_amount, payment_method, payment_status, order_status, shipping_address_id, coupon_ids, total_coupon_discount, final_amount, notes, created_at, updated_at, reference_id"
    },
    {
        "name": "product_prices",
        "new_sql": """CREATE TABLE product_prices_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'USD',
            price DECIMAL(10,2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(product_id, currency),
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )""",
        "cols": "id, product_id, currency, price, created_at, updated_at"
    },
    {
        "name": "product_activities",
        "new_sql": """CREATE TABLE product_activities_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            activity_category_id INTEGER NOT NULL,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            FOREIGN KEY (activity_category_id) REFERENCES activity_categories(id) ON DELETE CASCADE
        )""",
        "cols": "id, product_id, activity_category_id, start_time, end_time, created_at"
    },
    {
        "name": "payment_logs",
        "new_sql": """CREATE TABLE payment_logs_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            order_number VARCHAR(100) NOT NULL,
            payment_method VARCHAR(50) NOT NULL,
            transaction_id VARCHAR(100),
            amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(10) NOT NULL,
            status VARCHAR(50) NOT NULL,
            error_code VARCHAR(100),
            error_message TEXT,
            raw_response TEXT,
            is_success BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            platform_order_id VARCHAR(100),
            payment_stage VARCHAR(50),
            extra_data TEXT DEFAULT '{}',
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )""",
        "cols": "id, order_id, order_number, payment_method, transaction_id, amount, currency, status, error_code, error_message, raw_response, is_success, created_at, platform_order_id, payment_stage, extra_data"
    },
    {
        "name": "order_coupons",
        "new_sql": """CREATE TABLE order_coupons_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            coupon_id INTEGER,
            user_id INTEGER,
            discount_applied DECIMAL(10,2) NOT NULL DEFAULT 0,
            status VARCHAR(20) DEFAULT 'active',
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            refunded_at TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )""",
        "cols": "id, order_id, coupon_id, user_id, discount_applied, status, applied_at, refunded_at"
    },
    {
        "name": "product_activity_logs",
        "new_sql": """CREATE TABLE product_activity_logs_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            activity_id INTEGER NOT NULL,
            action VARCHAR(20) NOT NULL,
            start_time TIMESTAMP,
            end_time TIMESTAMP,
            operator_name VARCHAR(50) DEFAULT 'system',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            details TEXT,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            FOREIGN KEY (activity_id) REFERENCES product_activities(id) ON DELETE CASCADE
        )""",
        "cols": "id, product_id, activity_id, action, start_time, end_time, operator_name, created_at, details"
    },
]

success_count = 0
fail_count = 0

for m in MIGRATIONS:
    name = m["name"]
    print(f"\n{'='*60}")
    print(f"迁移: {name}")
    
    try:
        conn.execute(m["new_sql"])
        copy_sql = f"INSERT INTO {name}_new ({m['cols']}) SELECT {m['cols']} FROM {name}"
        conn.execute(copy_sql)
        count = conn.execute(f"SELECT COUNT(*) FROM {name}_new").fetchone()[0]
        print(f"  ✅ 数据复制: {count} 行")
        
        conn.execute(f"DROP TABLE {name}")
        conn.execute(f"ALTER TABLE {name}_new RENAME TO {name}")
        conn.commit()
        print(f"  ✅ 迁移成功")
        success_count += 1
    except Exception as e:
        print(f"  ❌ 迁移失败: {e}")
        conn.rollback()
        fail_count += 1

print(f"\n{'='*60}")
print(f"迁移完成: {success_count} 成功, {fail_count} 失败")
print(f"{'='*60}")

print("\n外键验证:")
tables_to_check = ['inventory', 'inventory_transactions', 'inventory_alerts', 'inventory_checks', 'orders', 'product_prices', 'product_activities', 'payment_logs', 'order_coupons', 'product_activity_logs']
for t in tables_to_check:
    fks = conn.execute(f"PRAGMA foreign_key_list({t})").fetchall()
    print(f"  {t}: {len(fks)} FK")

conn.close()
print(f"\n✅ 外键迁移完毕！备份: {BACKUP_PATH}")
