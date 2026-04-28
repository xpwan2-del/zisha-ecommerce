import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Start transaction
    await query('BEGIN');

    // Clear existing products
    await query('DELETE FROM products');

    // Seed data
    const products = [
      {
        id: 1,
        name: "Classic Zisha Teapot",
        name_en: "Classic Zisha Teapot",
        name_ar: "إبوة زيشا الكلاسيكية",
        price: 120,
        original_price: 150,
        stock: 50,
        category_id: "teapots",
        image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classic%20zisha%20teapot%20with%20traditional%20design%20front%20view&image_size=square",
        images: [
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classic%20zisha%20teapot%20with%20traditional%20design%20front%20view&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classic%20zisha%20teapot%20side%20view&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classic%20zisha%20teapot%20top%20view&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classic%20zisha%20teapot%20with%20tea%20inside&image_size=square"
        ],
        description: "Handcrafted from authentic Yixing clay, this classic zisha teapot is perfect for brewing all types of tea. The natural porous nature of zisha clay helps to enhance the flavor of tea over time, making it a favorite among tea enthusiasts.",
        features: [
          "Authentic Yixing clay",
          "Handcrafted by skilled artisans",
          "150ml capacity",
          "Heat resistant",
          "Enhances tea flavor"
        ],
        is_limited: true,
        discount: 20
      },
      {
        id: 2,
        name: "Zisha Tea Cup Set",
        name_en: "Zisha Tea Cup Set",
        name_ar: "مجموعة أكواب الشاي من زيشا",
        price: 85,
        original_price: 100,
        stock: 30,
        category_id: "cups",
        image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20cups%20set%20of%204%20arranged%20on%20table&image_size=square",
        images: [
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20cups%20set%20of%204%20arranged%20on%20table&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20cups%20close%20up&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20cups%20stacked&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20cups%20with%20tea%20inside&image_size=square"
        ],
        description: "This elegant set of zisha tea cups is perfect for enjoying tea with friends and family. Each cup is handcrafted from authentic Yixing clay, providing a unique drinking experience.",
        features: [
          "Set of 4 cups",
          "Authentic Yixing clay",
          "60ml capacity each",
          "Smooth finish",
          "Stackable design"
        ],
        is_limited: false,
        discount: 0
      },
      {
        id: 3,
        name: "Premium Zisha Teapot",
        name_en: "Premium Zisha Teapot",
        name_ar: "إبوة زيشا المميزة",
        price: 180,
        original_price: 220,
        stock: 20,
        category_id: "teapots",
        image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=premium%20zisha%20teapot%20with%20intricate%20carving%20front%20view&image_size=square",
        images: [
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=premium%20zisha%20teapot%20with%20intricate%20carving%20front%20view&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=premium%20zisha%20teapot%20side%20view%20with%20carvings&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=premium%20zisha%20teapot%20top%20view&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=premium%20zisha%20teapot%20with%20wooden%20handle&image_size=square"
        ],
        description: "This premium zisha teapot features intricate hand-carved designs and is made from the finest Yixing clay. It's a true work of art that will enhance any tea ceremony.",
        features: [
          "Premium Yixing clay",
          "Intricate hand-carved designs",
          "200ml capacity",
          "Wooden handle",
          "Comes with a gift box"
        ],
        is_limited: true,
        discount: 18
      },
      {
        id: 4,
        name: "Zisha Tea Set Complete",
        name_en: "Zisha Tea Set Complete",
        name_ar: "مجموعة الشاي الكاملة من زيشا",
        price: 280,
        original_price: 350,
        stock: 15,
        category_id: "sets",
        image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=complete%20zisha%20tea%20set%20with%20teapot%20cups%20and%20tray&image_size=square",
        images: [
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=complete%20zisha%20tea%20set%20with%20teapot%20cups%20and%20tray&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20set%20arranged%20on%20table&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20set%20close%20up&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20set%20with%20brewing%20tea&image_size=square"
        ],
        description: "This complete zisha tea set includes a teapot, four cups, and a tea tray. It's everything you need to start enjoying the traditional Chinese tea ceremony at home.",
        features: [
          "Complete tea set",
          "Authentic Yixing clay",
          "Teapot + 4 cups + tray",
          "Elegant design",
          "Perfect for gifting"
        ],
        is_limited: true,
        discount: 20
      },
      {
        id: 5,
        name: "Zisha Tea Accessories",
        name_en: "Zisha Tea Accessories",
        name_ar: "إكسسوارات الشاي من زيشا",
        price: 50,
        original_price: 60,
        stock: 40,
        category_id: "accessories",
        image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20accessories%20set%20with%20strainer%20spoon%20and%20pick&image_size=square",
        images: [
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20accessories%20set%20with%20strainer%20spoon%20and%20pick&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tea%20strainer%20close%20up&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tea%20spoon%20and%20pick&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tea%20accessories%20in%20use&image_size=square"
        ],
        description: "This set of zisha tea accessories includes a tea strainer, tea spoon, and tea pick. These essential tools will enhance your tea brewing experience.",
        features: [
          "Set of 3 accessories",
          "Strainer + spoon + pick",
          "Durable construction",
          "Easy to clean",
          "Essential for tea brewing"
        ],
        is_limited: false,
        discount: 0
      },
      {
        id: 6,
        name: "Mini Zisha Teapot",
        name_en: "Mini Zisha Teapot",
        name_ar: "إبوة زيشا المصغرة",
        price: 90,
        original_price: 110,
        stock: 25,
        category_id: "teapots",
        image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mini%20zisha%20teapot%20portable%20front%20view&image_size=square",
        images: [
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mini%20zisha%20teapot%20portable%20front%20view&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mini%20zisha%20teapot%20side%20view&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mini%20zisha%20teapot%20with%20tea%20inside&image_size=square",
          "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mini%20zisha%20teapot%20in%20hand&image_size=square"
        ],
        description: "This compact mini zisha teapot is perfect for travel or for enjoying a single cup of tea. Despite its small size, it retains all the qualities of a traditional zisha teapot.",
        features: [
          "Compact size",
          "Perfect for travel",
          "80ml capacity",
          "Lightweight design",
          "Portable and convenient"
        ],
        is_limited: true,
        discount: 18
      }
    ];

    // Insert products
    for (const product of products) {
      await query(
        `INSERT INTO products (id, name, name_en, name_ar, price, original_price, stock, category_id, image, images, description, features, is_limited, discount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          product.name,
          product.name_en,
          product.name_ar,
          product.price,
          product.original_price,
          product.stock,
          product.category_id,
          product.image,
          JSON.stringify(product.images),
          product.description,
          JSON.stringify(product.features),
          product.is_limited ? 1 : 0,
          product.discount
        ]
      );

      // 写入 inventory 表
      const calculateSeedStatusId = (qty: number): number => {
        if (qty <= 0) return 4;
        if (qty <= 5) return 3;
        if (qty <= 10) return 2;
        return 1;
      };
      const seedStatusId = calculateSeedStatusId(product.stock || 0);
      await query(
        `INSERT INTO inventory (product_id, product_name, quantity, status_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [product.id, product.name, product.stock || 0, seedStatusId]
      );

      // 写入 inventory_transactions 表
      const typeResult = await query('SELECT id FROM transaction_type WHERE code = ?', ['self_estock']);
      const transactionTypeId = typeResult.rows[0]?.id || 14;

      await query(
        `INSERT INTO inventory_transactions (product_id, product_name, transaction_type_id, quantity_change, quantity_before, quantity_after, reason, operator_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [product.id, product.name, transactionTypeId, product.stock || 0, 0, product.stock || 0, 'Seed data initialization', 'system']
      );
    }

    // Commit transaction
    await query('COMMIT');

    return NextResponse.json({ message: 'Products seeded successfully' }, { status: 200 });
  } catch (error) {
    // Rollback transaction on error
    await query('ROLLBACK');
    console.error('Error seeding products:', error);
    return NextResponse.json({ error: 'Failed to seed products' }, { status: 500 });
  }
}
