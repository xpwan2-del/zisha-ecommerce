import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const mockProducts = [
  {    id: 1,
    name: "Classic Zisha Teapot",
    name_en: "Classic Zisha Teapot",
    name_ar: "إبوة زيشا الكلاسيكية",
    price: 120,
    original_price: 150,
    stock: 50,
    category_id: "1",
    image: "https://placehold.co/400x400/e8d4c4/ffffff?text=Classic+Zisha+Teapot",
    images: [
      "https://placehold.co/400x400/e8d4c4/ffffff?text=Classic+Zisha+Teapot",
      "https://placehold.co/400x400/d4a574/ffffff?text=Side+View",
      "https://placehold.co/400x400/c9a686/ffffff?text=Top+View",
      "https://placehold.co/400x400/b89776/ffffff?text=With+Tea"
    ],
    description: "Handcrafted from authentic Yixing clay, this classic zisha teapot is perfect for brewing all types of tea.",
    features: ["Authentic Yixing clay", "Handcrafted by skilled artisans", "150ml capacity"],
    is_limited: true,
    discount: 20,
    activities: [
      { id: 1, name: "限时特惠", name_en: "Limited Time Offer", name_ar: "عرض لفترة محدودة", icon: "fire", color: "#FF5733" },
      { id: 3, name: "畅销商品", name_en: "Bestseller", name_ar: "الأكثر مبيعًا", icon: "trophy", color: "#3357FF" }
    ]
  },
  {
    id: 2,
    name: "Zisha Tea Cup Set",
    name_en: "Zisha Tea Cup Set",
    name_ar: "مجموعة أكواب الشاي من زيشا",
    price: 85,
    original_price: 100,
    stock: 30,
    category_id: "2",
    image: "https://placehold.co/400x400/a8d5ba/ffffff?text=Zisha+Tea+Cup+Set",
    images: [
      "https://placehold.co/400x400/a8d5ba/ffffff?text=Zisha+Tea+Cup+Set",
      "https://placehold.co/400x400/7bc4c4/ffffff?text=Close+Up"
    ],
    description: "Beautiful set of 4 zisha tea cups, perfect for tea ceremonies.",
    features: ["Set of 4 cups", "Handmade", "Elegant design"],
    is_limited: false,
    discount: 0,
    activities: [
      { id: 2, name: "新品上市", name_en: "New Arrival", name_ar: "وصل جديد", icon: "star", color: "#33FF57" }
    ]
  },
  {
    id: 3,
    name: "Premium Zisha Teapot",
    name_en: "Premium Zisha Teapot",
    name_ar: "إبوة زيشا المميزة",
    price: 200,
    original_price: 250,
    stock: 20,
    category_id: "1",
    image: "https://placehold.co/400x400/f4d03f/ffffff?text=Premium+Zisha+Teapot",
    images: [
      "https://placehold.co/400x400/f4d03f/ffffff?text=Premium+Zisha+Teapot",
      "https://placehold.co/400x400/e74c3c/ffffff?text=Side+View",
      "https://placehold.co/400x400/c0392b/ffffff?text=Top+View"
    ],
    description: "Premium quality zisha teapot with gold trim, perfect for special occasions.",
    features: ["Premium quality", "Gold trim", "200ml capacity"],
    is_limited: true,
    discount: 15,
    activities: [
      { id: 4, name: "独家定制", name_en: "Exclusive", name_ar: "حصري", icon: "crown", color: "#FF33F1" },
      { id: 5, name: "库存有限", name_en: "Limited Stock", name_ar: "مخزون محدود", icon: "alert-circle", color: "#FFB733" }
    ]
  },
  {
    id: 4,
    name: "Traditional Tea Set",
    name_en: "Traditional Tea Set",
    name_ar: "مجموعة الشاي التقليدية",
    price: 350,
    original_price: 400,
    stock: 15,
    category_id: "3",
    image: "https://placehold.co/400x400/27ae60/ffffff?text=Traditional+Tea+Set",
    images: [
      "https://placehold.co/400x400/27ae60/ffffff?text=Traditional+Tea+Set",
      "https://placehold.co/400x400/2ecc71/ffffff?text=Side+View"
    ],
    description: "Complete traditional tea set with teapot and 6 cups.",
    features: ["Complete set", "Teapot + 6 cups", "Traditional design"],
    is_limited: false,
    discount: 10,
    activities: [
      { id: 1, name: "限时特惠", name_en: "Limited Time Offer", name_ar: "عرض لفترة محدودة", icon: "fire", color: "#FF5733" },
      { id: 2, name: "新品上市", name_en: "New Arrival", name_ar: "وصل جديد", icon: "star", color: "#33FF57" },
      { id: 3, name: "畅销商品", name_en: "Bestseller", name_ar: "الأكثر مبيعًا", icon: "trophy", color: "#3357FF" }
    ]
  }
];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '12');
  const category = url.searchParams.get('category');
  const search = url.searchParams.get('search');
  const minPrice = url.searchParams.get('minPrice');
  const maxPrice = url.searchParams.get('maxPrice');
  const sort = url.searchParams.get('sort') || 'newest';
  
  try {
    
    let whereClause = '';
    let params: any[] = [];
    
    if (category && category !== 'all') {
      whereClause = `WHERE category_id = ?`;
      params.push(category);
    }
    
    if (search) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += `(name LIKE ? OR name_en LIKE ? OR description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (minPrice) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += `price >= ?`;
      params.push(parseFloat(minPrice));
    }
    
    if (maxPrice) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += `price <= ?`;
      params.push(parseFloat(maxPrice));
    }
    
    let orderBy = 'ORDER BY id DESC';
    switch (sort) {
      case 'price-asc':
        orderBy = 'ORDER BY price ASC';
        break;
      case 'price-desc':
        orderBy = 'ORDER BY price DESC';
        break;
      case 'sales':
        orderBy = 'ORDER BY stock DESC';
        break;
    }
    
    const offset = (page - 1) * limit;
    
    const countQuery = `SELECT COUNT(*) as count FROM products ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = countResult.rows && countResult.rows[0] ? parseInt(String(countResult.rows[0].count)) : 0;
    
    const productsQuery = `
      SELECT * FROM products
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);
    
    const productsResult = await query(productsQuery, params);
    const products = await Promise.all(productsResult.rows.map(async (row: any) => {
      row.price = parseFloat(row.price) || 0;
      row.original_price = parseFloat(row.original_price) || 0;
      row.stock = parseInt(row.stock) || 0;

      if (row.images) {
        try {
          row.images = JSON.parse(row.images);
        } catch (error) {
          row.images = [];
        }
      } else {
        row.images = [];
      }

      if (row.features) {
        try {
          row.features = JSON.parse(row.features);
        } catch (error) {
          row.features = [];
        }
      } else {
        row.features = [];
      }

      row.activities = [];

      const reviewStats = await query(
        'SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM reviews WHERE product_id = ?',
        [row.id]
      );
      const stats = reviewStats.rows[0];
      row.reviewCount = parseInt(String(stats?.count || 0));
      row.rating = stats?.avg_rating ? parseFloat(String(stats.avg_rating)).toFixed(1) : '5.0';

      return row;
    }));
    
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      products,
      total,
      page,
      totalPages
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    
    // 直接返回空数据，不使用mock数据
    return NextResponse.json({
      products: [],
      total: 0,
      page: 1,
      totalPages: 0
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, name_en, name_ar, price, original_price, stock, category_id, image, images, video, description, features, specifications, shipping, after_sale, is_limited, discount } = body;
    
    const result = await query(
      `INSERT INTO products (name, name_en, name_ar, price, original_price, stock, category_id, image, images, video, description, features, specifications, shipping, after_sale, is_limited, discount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, name_en, name_ar, price, original_price || 0, stock, category_id, image, JSON.stringify(images || []), video || '', description, JSON.stringify(features || []), JSON.stringify(specifications || {}), JSON.stringify(shipping || {}), JSON.stringify(after_sale || {}), is_limited ? 1 : 0, discount || 0]
    );
    
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
