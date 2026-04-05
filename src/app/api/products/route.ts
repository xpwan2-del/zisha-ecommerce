import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const mockProducts = [
  {
    id: 1,
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
    display_mode: "single",
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
      row.display_mode = row.display_mode || 'double';

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

    const teapotNames = [
      "紫砂壶", "朱泥壶", "段泥壶", "清水泥壶", "紫泥壶", "红泥壶", "本山绿壶", "墨绿泥壶",
      "天青泥壶", "蟹黄泥壶", "龙血砂壶", "青灰泥壶", "紫茄泥壶", "芒果泥壶", "梨皮泥壶",
      "桂花砂壶", "五彩泥壶", "粉墨泥壶", "紫红泥壶", "朱砂紫壶", "黑星砂壶", "赤紫泥壶",
      "青灰段壶", "芝麻段壶", "黄金段壶", "老段泥壶", "小红泥壶", "大红袍壶", "朱泥小品壶",
      "朱泥中品壶", "朱泥大品壶", "紫砂小品壶", "紫砂中品壶", "紫砂大品壶", "手拉胚壶",
      "注浆成型壶", "机车成型壶", "拍身桶壶", "身筒成型壶", "筋纹器壶", "花器壶", "光器壶",
      "提梁壶", "侧把壶", "急须壶", "茶釜壶", "铁壶", "银壶", "铜壶", "锡壶", "陶壶",
      "瓷壶", "玻璃壶", "石壶", "木壶", "竹壶", "椰壳壶", "紫砂套壶", "紫砂茶组壶",
      "个人杯壶", "待客壶", "收藏壶", "把玩壶", "实用壶", "装饰壶", "大师壶", "名家壶",
      "手工壶", "机制壶", "半手工壶", "原矿壶", "拼配壶", "化工壶", "老壶", "新壶",
      "精品壶", "普通壶", "入门壶", "进阶壶", "高端壶", "收藏级壶", "实用级壶", "礼品壶",
      "茶器套装", "主人杯套装", "茶海套装", "茶盘套装", "茶夹套装", "茶漏套装", "茶匙套装", "茶针套装"
    ];

    const colors = ["e8d4c4", "d4a574", "c9a686", "b89776", "a88d7c", "9c8275", "8b7568", "7a665b", "6b584f", "5c4a3d"];
    const mockTeapots = Array.from({ length: 100 }, (_, i) => {
      const nameIdx = i % teapotNames.length;
      const colorIdx = Math.floor(i / teapotNames.length) % colors.length;
      const encodedName = encodeURIComponent(teapotNames[nameIdx]);
      const imageUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20yixing%20zisha%20clay%20teapot%20${encodedName}%20classic%20design%20handcrafted&image_size=square`;
      return {
        id: 10000 + i,
        name: `${teapotNames[nameIdx]} ${Math.floor(i / teapotNames.length) + 1}号`,
        name_en: `Zisha Teapot ${teapotNames[nameIdx]} #${Math.floor(i / teapotNames.length) + 1}`,
        name_ar: `إبوة زيشا ${teapotNames[nameIdx]} #${Math.floor(i / teapotNames.length) + 1}`,
        price: 299 + (i * 37) % 2000,
        original_price: 0,
        stock: 10 + (i * 13) % 90,
        category_id: 1,
        image: imageUrl,
        images: [imageUrl],
        description: `优质宜兴紫砂壶，${teapotNames[nameIdx]}，泥料上乘，做工精细。`,
        features: ["宜兴紫砂", "手工制作", "泥料正宗"],
        is_limited: false,
        discount: 0,
        display_mode: i % 5 === 0 ? 'single' : 'double',
        activities: []
      };
    });

    return NextResponse.json({
      products: mockTeapots,
      total: 100,
      page: 1,
      totalPages: 1
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, name_en, name_ar, price, original_price, stock, category_id, image, images, video, description, features, specifications, shipping, after_sale, is_limited, discount } = body;
    
    const result = await query(
      `INSERT INTO products (name, name_en, name_ar, price, original_price, stock, category_id, image, images, video, description, features, specifications, shipping, after_sale, is_limited, discount, display_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, name_en, name_ar, price, original_price || 0, stock, category_id, image, JSON.stringify(images || []), video || '', description, JSON.stringify(features || []), JSON.stringify(specifications || {}), JSON.stringify(shipping || {}), JSON.stringify(after_sale || {}), is_limited ? 1 : 0, discount || 0, body.display_mode || 'double']
    );
    
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'batch_insert_teapots') {
      const teapotNames = [
        "紫砂壶", "朱泥壶", "段泥壶", "清水泥壶", "紫泥壶", "红泥壶", "本山绿壶", "墨绿泥壶",
        "天青泥壶", "蟹黄泥壶", "龙血砂壶", "青灰泥壶", "紫茄泥壶", "芒果泥壶", "梨皮泥壶",
        "桂花砂壶", "五彩泥壶", "粉墨泥壶", "紫红泥壶", "朱砂紫壶", "黑星砂壶", "赤紫泥壶",
        "青灰段壶", "芝麻段壶", "黄金段壶", "老段泥壶", "小红泥壶", "大红袍壶", "朱泥小品壶",
        "朱泥中品壶", "朱泥大品壶", "紫砂小品壶", "紫砂中品壶", "紫砂大品壶", "手拉胚壶",
        "注浆成型壶", "机车成型壶", "拍身桶壶", "身筒成型壶", "筋纹器壶", "花器壶", "光器壶",
        "提梁壶", "侧把壶", "急须壶", "茶釜壶", "铁壶", "银壶", "铜壶", "锡壶", "陶壶",
        "瓷壶", "玻璃壶", "石壶", "木壶", "竹壶", "椰壳壶", "紫砂套壶", "紫砂茶组壶",
        "个人杯壶", "待客壶", "收藏壶", "把玩壶", "实用壶", "装饰壶", "大师壶", "名家壶",
        "手工壶", "机制壶", "半手工壶", "原矿壶", "拼配壶", "化工壶", "老壶", "新壶",
        "精品壶", "普通壶", "入门壶", "进阶壶", "高端壶", "收藏级壶", "实用级壶", "礼品壶",
        "茶器套装", "主人杯套装", "茶海套装", "茶盘套装", "茶夹套装", "茶漏套装", "茶匙套装", "茶针套装"
      ];

      const inserted = [];
      for (let i = 0; i < 100; i++) {
        const nameIdx = i % teapotNames.length;
        const imageUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20yixing%20zisha%20clay%20teapot%20${encodeURIComponent(teapotNames[nameIdx])}%20classic%20design%20handcrafted&image_size=square`;
        const name = `${teapotNames[nameIdx]} ${Math.floor(i / teapotNames.length) + 1}号`;
        const price = 299 + (i * 37) % 2000;
        const stock = 10 + (i * 13) % 90;
        const displayMode = i % 5 === 0 ? 'single' : 'double';

        await query(
          `INSERT INTO products (name, name_en, name_ar, price, original_price, stock, category_id, image, images, description, features, is_limited, discount, display_mode, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [name, `Zisha Teapot ${teapotNames[nameIdx]} #${Math.floor(i / teapotNames.length) + 1}`, `إبوة زيشا ${teapotNames[nameIdx]} #${Math.floor(i / teapotNames.length) + 1}`,
           price, 0, stock, 1, imageUrl, JSON.stringify([imageUrl]),
           `优质宜兴紫砂壶，${teapotNames[nameIdx]}，泥料上乘，做工精细。`,
           JSON.stringify(["宜兴紫砂", "手工制作", "泥料正宗"]), 0, 0, displayMode]
        );
        inserted.push(name);
      }
      return NextResponse.json({ success: true, count: inserted.length, names: inserted.slice(0, 5) });
    }

    if (action === 'batch_insert_cups') {
      const cupNames = [
        "紫砂杯", "朱泥杯", "段泥杯", "清水泥杯", "紫泥杯", "红泥杯", "本山绿杯", "墨绿泥杯",
        "天青泥杯", "蟹黄泥杯", "龙血砂杯", "青灰泥杯", "紫茄泥杯", "芒果泥杯", "梨皮泥杯",
        "桂花砂杯", "五彩泥杯", "粉墨泥杯", "紫红泥杯", "朱砂紫杯", "黑星砂杯", "赤紫泥杯",
        "青灰段杯", "芝麻段杯", "黄金段杯", "老段泥杯", "小红泥杯", "大红袍杯", "朱泥小品杯",
        "朱泥中品杯", "朱泥大品杯", "紫砂小品杯", "紫砂中品杯", "紫砂大品杯", "手拉胚杯",
        "主人杯", "品茗杯", "闻香杯", "压手杯", "撇口杯", "敛口杯", "圆口杯", "方口杯",
        "筋纹杯", "花口杯", "单杯", "对杯", "套杯", "个人杯", "待客杯", "收藏杯"
      ];

      const inserted = [];
      for (let i = 0; i < 50; i++) {
        const nameIdx = i % cupNames.length;
        const imageUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20yixing%20zisha%20clay%20tea%20cup%20${encodeURIComponent(cupNames[nameIdx])}%20elegant%20design%20handcrafted%20professional%20photography&image_size=square`;
        const name = `${cupNames[nameIdx]} ${Math.floor(i / cupNames.length) + 1}号`;
        const price = 99 + (i * 23) % 500;
        const stock = 20 + (i * 7) % 80;

        await query(
          `INSERT INTO products (name, name_en, name_ar, price, original_price, stock, category_id, image, images, description, features, is_limited, discount, display_mode, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [name, `Zisha Tea Cup ${cupNames[nameIdx]} #${Math.floor(i / cupNames.length) + 1}`, `كوب شاي زيشا ${cupNames[nameIdx]} #${Math.floor(i / cupNames.length) + 1}`,
           price, 0, stock, 2, imageUrl, JSON.stringify([imageUrl]),
           `优质宜兴紫砂茶杯，${cupNames[nameIdx]}，泥料上乘，做工精细，适合品茗。`,
           JSON.stringify(["宜兴紫砂", "手工制作", "品茗佳品"]), 0, 0, 'double']
        );
        inserted.push(name);
      }
      return NextResponse.json({ success: true, count: inserted.length, names: inserted.slice(0, 5) });
    }

    if (action === 'batch_insert_accessories') {
      const accessoryNames = [
        "茶盘", "茶海", "茶壶", "茶夹", "茶漏", "茶匙", "茶针", "茶则",
        "茶盂", "茶桶", "茶巾", "茶宠", "茶案", "茶炉", "茶亭", "茶架",
        "茶柜", "茶箱", "茶盒", "茶袋", "公道杯", "过滤网", "茶刷", "茶拔",
        "壶叉", "壶钮", "壶盖", "壶身", "壶底", "壶嘴", "壶把", "壶肩",
        "紫砂罐", "茶叶罐", "醒茶罐", "储茶罐", "旅行茶具", "办公茶具", "户外茶具"
      ];

      const inserted = [];
      for (let i = 0; i < 50; i++) {
        const nameIdx = i % accessoryNames.length;
        const imageUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20yixing%20zisha%20tea%20accessory%20${encodeURIComponent(accessoryNames[nameIdx])}%20traditional%20handcrafted%20professional%20photography&image_size=square`;
        const name = `${accessoryNames[nameIdx]} ${Math.floor(i / accessoryNames.length) + 1}号`;
        const price = 39 + (i * 17) % 300;
        const stock = 30 + (i * 11) % 70;

        await query(
          `INSERT INTO products (name, name_en, name_ar, price, original_price, stock, category_id, image, images, description, features, is_limited, discount, display_mode, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [name, `Zisha Tea Accessory ${accessoryNames[nameIdx]} #${Math.floor(i / accessoryNames.length) + 1}`, `إكسسوار شاي زيشا ${accessoryNames[nameIdx]} #${Math.floor(i / accessoryNames.length) + 1}`,
           price, 0, stock, 3, imageUrl, JSON.stringify([imageUrl]),
           `优质茶具配件，${accessoryNames[nameIdx]}，做工精细，实用耐用。`,
           JSON.stringify(["优质材料", "手工制作", "实用设计"]), 0, 0, 'double']
        );
        inserted.push(name);
      }
      return NextResponse.json({ success: true, count: inserted.length, names: inserted.slice(0, 5) });
    }

    if (action === 'batch_insert_sets') {
      const setNames = [
        "紫砂茶具套装", "朱泥茶具套装", "段泥茶具套装", "清水泥茶具套装", "紫泥茶具套装",
        "红泥茶具套装", "本山绿茶具套装", "墨绿泥茶具套装", "天青泥茶具套装", "蟹黄泥茶具套装",
        "茶具一壶四杯套装", "茶具一壶六杯套装", "茶具两壶六杯套装", "茶具旅行套装", "茶具办公套装",
        "茶具户外套装", "茶具收藏套装", "茶具礼品套装", "茶具入门套装", "茶具进阶套装",
        "茶具大师套装", "茶具名家套装", "茶具精品套装", "茶具普通套装", "茶具手拉胚套装",
        "茶具机车套装", "茶具半手工套装", "茶具全手工套装", "茶具原矿套装", "茶具拼配套装"
      ];

      const inserted = [];
      for (let i = 0; i < 30; i++) {
        const nameIdx = i % setNames.length;
        const imageUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20yixing%20zisha%20tea%20set%20${encodeURIComponent(setNames[nameIdx])}%20complete%20traditional%20elegant%20professional%20photography&image_size=square`;
        const name = `${setNames[nameIdx]} ${Math.floor(i / setNames.length) + 1}号`;
        const price = 599 + (i * 47) % 2000;
        const stock = 5 + (i * 3) % 30;
        const displayMode = i % 4 === 0 ? 'single' : 'double';

        await query(
          `INSERT INTO products (name, name_en, name_ar, price, original_price, stock, category_id, image, images, description, features, is_limited, discount, display_mode, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [name, `Zisha Tea Set ${setNames[nameIdx]} #${Math.floor(i / setNames.length) + 1}`, `مجموعة شاي زيشا ${setNames[nameIdx]} #${Math.floor(i / setNames.length) + 1}`,
           price, 0, stock, 4, imageUrl, JSON.stringify([imageUrl]),
           `优质宜兴紫砂茶具套装，${setNames[nameIdx]}，配置齐全，做工精细，是品茗待客的最佳选择。`,
           JSON.stringify(["宜兴紫砂", "一壶多杯", "配置齐全", "礼品佳品"]), 0, 0, displayMode]
        );
        inserted.push(name);
      }
      return NextResponse.json({ success: true, count: inserted.length, names: inserted.slice(0, 5) });
    }

    if (action === 'batch_update_images') {
      const products = await query('SELECT id, category_id, name FROM products');

      let updated = 0;
      for (const product of products.rows) {
        const productId = Number(product.id);
        const images = [];
        for (let i = 0; i < 6; i++) {
          images.push(`https://picsum.photos/seed/${productId * 10 + i}/400/400`);
        }

        await query(
          'UPDATE products SET image = ?, images = ? WHERE id = ?',
          [images[0], JSON.stringify(images), product.id]
        );
        updated++;
      }
      return NextResponse.json({ success: true, count: updated });
    }

    if (action === 'delete_all') {
      await query('PRAGMA foreign_keys = OFF');
      await query('DELETE FROM products');
      await query('PRAGMA foreign_keys = ON');
      return NextResponse.json({ success: true, message: 'All products deleted' });
    }

    if (action === 'generate_products') {
      const teapotNames = ['石瓢壶', '西施壶', '仿古壶', '井栏壶', '掇球壶', '提梁壶', '龙蛋壶', '水平壶', '容天壶', '福临壶', '思亭壶', '乳鼎壶', '汉扁壶', '柱楚壶', '平盖壶', '桶子壶', '汤婆壶', '铜鼓壶', '风卷葵', '菊花壶', '梅花壶', '竹节壶', '南瓜壶', '莲子壶', '佛手壶', '石榴壶', '桃子壶', '茄子壶', '黄瓜壶', '葫芦壶', '美人肩壶'];
      const cupNames = ['品茗杯', '闻香杯', '功夫杯', '主人杯', '客杯', '公道杯', '普洱杯', '绿茶杯', '红茶杯', '乌龙茶杯', '斗笠杯', '圆融杯', '束口杯', '敞口杯', '敛口杯', '高足杯', '压手杯', '盏', '盅', '碗', '莲花杯', '菊花杯', '梅花杯', '竹叶杯', '南瓜杯', '桃子杯', '石榴杯', '柿子杯', '苹果杯', '梨子杯'];
      const accessoryNames = ['茶叶罐', '公道杯', '茶海', '茶盘', '茶夹', '茶拨', '茶漏', '茶针', '茶宠', '茶巾', '茶洗', '水盂', '痰盂', '盖置', '杯托', '壶承', '壶垫', '养壶笔', '茶道六君子', '普洱刀', '茶滤', '茶巾盘', '香炉', '花插', '屏风', '柜子', '箱子', '盒子', '杯子', '茶具套装'];
      const setNames = ['紫砂套组', '功夫茶具套装', '普洱茶具套装', '绿茶茶具套装', '红茶茶具套装', '乌龙茶具套装', '茶道套装', '礼品茶具套装', '精品茶具套装', '豪华茶具套装', '简约茶具套装', '传统茶具套装', '现代茶具套装', '大师茶具套装', '手工茶具套装', '定制茶具套装', '经典茶具套装', '流行茶具套装', '复古茶具套装', '时尚茶具套装', '商务茶具套装', '旅行茶具套装', '办公室茶具套装', '家用茶具套装', '收藏茶具套装', '把玩茶具套装', '展示茶具套装', '实用茶具套装', '装饰茶具套装', '多功能茶具套装'];

      const categories = [
        { id: 1, names: teapotNames, basePrice: 299, desc: '宜兴紫砂壶手工制作', prompt: 'Yixing Zisha purple clay teapot traditional Chinese pottery' },
        { id: 2, names: cupNames, basePrice: 99, desc: '宜兴紫砂茶杯品茗杯', prompt: 'Yixing Zisha purple clay tea cup handcrafted' },
        { id: 3, names: accessoryNames, basePrice: 59, desc: '茶道配件精品', prompt: 'Yixing Zisha teaware accessories tea set' },
        { id: 4, names: setNames, basePrice: 599, desc: '紫砂茶具套装', prompt: 'Yixing Zisha purple clay tea set complete teaware collection' }
      ];

      let totalInserted = 0;

      for (const cat of categories) {
        for (let i = 0; i < 30; i++) {
          const name = `${cat.names[i % cat.names.length]} ${Math.floor(i / cat.names.length) + 1}号`;
          const price = cat.basePrice + (i * 17) % 500;
          const originalPrice = Math.floor(price * (1.2 + (i % 5) * 0.1));
          const stock = 10 + (i * 7) % 90;
          const discount = ((i % 5) + 1) * 5;
          const isLimited = i % 3 === 0 ? 1 : 0;

          const productId = cat.id * 1000 + i;
          const images = [];
          for (let j = 0; j < 6; j++) {
            const seed = productId * 10 + j;
            const prompt = `${cat.prompt} variant ${j + 1}`;
            images.push(`https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=square`);
          }

          await query(
            `INSERT INTO products (name, name_en, name_ar, price, original_price, stock, category_id, image, images, description, features, is_limited, discount, display_mode)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              name,
              `${name} English`,
              `${name} Arabic`,
              price,
              originalPrice,
              stock,
              cat.id,
              images[0],
              JSON.stringify(images),
              `优质${cat.desc}，${name}，手工制作，泥料正宗`,
              JSON.stringify(['宜兴紫砂', '手工制作', '正品保证']),
              isLimited,
              discount,
              i % 3 === 0 ? 'single' : 'double'
            ]
          );
          totalInserted++;
        }
      }

      return NextResponse.json({ success: true, count: totalInserted });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const result = await query('DELETE FROM products WHERE id = ?', [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
