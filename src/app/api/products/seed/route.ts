import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 纯粹的紫砂壶图片URL
const zishaTeapotImages = [
  {
    main: "https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=400&h=400&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&h=400&fit=crop"
    ]
  },
  {
    main: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=400&h=400&fit=crop"
    ]
  },
  {
    main: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop"
    ]
  },
  {
    main: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&h=400&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop"
    ]
  },
  {
    main: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=400&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop"
    ]
  },
  {
    main: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=400&h=400&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop"
    ]
  }
];

const teapotNames = [
  "宜兴紫砂壶 经典款",
  "西施紫砂壶",
  "石瓢紫砂壶",
  "仿古紫砂壶",
  "掇球紫砂壶",
  "容天紫砂壶",
  "汉铎紫砂壶",
  "秦权紫砂壶",
  "子冶石瓢紫砂壶",
  "景舟石瓢紫砂壶",
  "曼生壶紫砂壶",
  "供春紫砂壶",
  "龙蛋紫砂壶",
  "梨形紫砂壶",
  "僧帽紫砂壶",
  "合欢紫砂壶",
  "潘壶紫砂壶",
  "茄段紫砂壶",
  "葫芦紫砂壶",
  "竹节紫砂壶",
  "梅花紫砂壶",
  "南瓜紫砂壶",
  "灵芝紫砂壶",
  "佛手紫砂壶",
  "松段紫砂壶",
  "梅桩紫砂壶",
  "树瘿紫砂壶",
  "青蛙莲子紫砂壶",
  "鱼化龙紫砂壶",
  "云龙紫砂壶",
  "龙凤紫砂壶",
  "百福紫砂壶",
  "百寿紫砂壶",
  "如意紫砂壶",
  "祥云紫砂壶",
  "回纹紫砂壶",
  "绳纹紫砂壶",
  "几何紫砂壶",
  "素面紫砂壶",
  "刻字紫砂壶",
  "刻画紫砂壶",
  "泥绘紫砂壶",
  "描金紫砂壶",
  "镶银紫砂壶",
  "包铜紫砂壶",
  "嵌玉紫砂壶",
  "开光紫砂壶",
  "四方紫砂壶",
  "六方紫砂壶",
  "八方紫砂壶"
];

const teapotDescriptions = [
  "采用正宗宜兴原矿紫砂泥，手工制作而成。壶身圆润饱满，出水流畅，是品茶爱好者的首选。",
  "西施壶造型圆润饱满，如美人出浴，深受壶友喜爱。采用优质紫砂泥，越用越润。",
  "石瓢壶造型独特，线条流畅，实用性与艺术性完美结合。适合冲泡各种茶叶。",
  "仿古壶传承经典设计，古朴典雅，展现传统紫砂壶的魅力。",
  "掇球壶造型饱满圆润，寓意团圆美满。采用上等紫砂泥，品质非凡。",
  "容天壶寓意胸襟开阔，能容天下事。壶身大气稳重，是收藏佳品。",
  "汉铎壶灵感来自古代乐器，造型独特，音韵悠扬。",
  "秦权壶造型稳重，如古权在握，寓意权威稳重。",
  "子冶石瓢为清代经典款式，文人气息浓厚，适合品茶赏壶。",
  "景舟石瓢为大师顾景舟经典之作，工艺精湛，收藏价值极高。",
  "曼生壶为清代文人陈曼生所创，诗书画印结合，文气盎然。",
  "供春壶为紫砂壶鼻祖，造型古朴自然，历史悠久。",
  "龙蛋壶造型圆润可爱，如蛋般圆润，寓意吉祥。",
  "梨形壶造型如梨，线条优美，秀气典雅。",
  "僧帽壶造型独特，如僧人帽子，禅意十足。",
  "合欢壶寓意和和美美，团圆美满，适合家庭使用。",
  "潘壶为清代潘仕成所创，造型独特，深受喜爱。",
  "茄段壶造型如茄子，自然生动，意趣盎然。",
  "葫芦壶寓意福禄双全，吉祥如意，造型生动。",
  "竹节壶造型如竹，高风亮节，寓意品格高尚。",
  "梅花壶造型如梅花，傲雪凌霜，寓意坚韧不拔。",
  "南瓜壶造型如南瓜，田园气息浓厚，生动有趣。",
  "灵芝壶寓意吉祥如意，健康长寿，造型生动。",
  "佛手壶寓意福寿双全，造型独特，寓意美好。",
  "松段壶造型如松树，苍劲有力，寓意长寿。",
  "梅桩壶造型如梅树，苍劲古朴，寓意坚韧。",
  "树瘿壶造型古朴自然，如老树瘤，返璞归真。",
  "青蛙莲子壶造型生动，青蛙栩栩如生，意趣盎然。",
  "鱼化龙壶寓意鲤鱼跃龙门，飞黄腾达，造型生动。",
  "云龙壶寓意龙腾云起，飞黄腾达，气势磅礴。",
  "龙凤壶寓意龙凤呈祥，吉祥如意，造型精美。",
  "百福壶寓意百福临门，吉祥如意，寓意美好。",
  "百寿壶寓意长命百岁，健康长寿，寓意吉祥。",
  "如意壶寓意万事如意，心想事成，造型优美。",
  "祥云壶寓意祥云瑞气，吉祥如意，造型生动。",
  "回纹壶传统回纹装饰，寓意连绵不断，富贵不断。",
  "绳纹壶如绳纹缠绕，寓意团结一心，不离不弃。",
  "几何壶现代几何造型，简洁大方，时尚典雅。",
  "素面壶素面朝天，返璞归真，展现紫砂泥本色之美。",
  "刻字壶壶身刻有诗词，文气盎然，适合文人雅士。",
  "刻画壶壶身刻有山水花鸟，生动如画，艺术价值高。",
  "泥绘壶采用泥绘工艺，色彩丰富，精美绝伦。",
  "描金壶采用描金工艺，金碧辉煌，华贵典雅。",
  "镶银壶采用镶银工艺，银白相间，高贵典雅。",
  "包铜壶采用包铜工艺，古色古香，韵味十足。",
  "嵌玉壶采用嵌玉工艺，玉石点缀，华贵非凡。",
  "开光壶采用开光装饰，层次感强，造型优美。",
  "四方壶四方造型，稳重端庄，寓意正直。",
  "六方壶六方造型，独特美观，寓意六六大顺。",
  "八方壶八方造型，精美绝伦，寓意八方来财。"
];

const teapotFeatures = [
  ["正宗宜兴原矿紫砂", "手工制作", "200ml容量", "耐高温", "越用越润"],
  ["优质紫砂泥", "圆润造型", "出水流畅", "180ml容量", "易清洗"],
  ["经典石瓢造型", "线条流畅", "实用性强", "220ml容量", "送礼佳品"],
  ["传统工艺", "古朴典雅", "收藏价值", "190ml容量", "越养越美"],
  ["圆润饱满", "寓意美好", "上等紫砂", "210ml容量", "送礼收藏"],
  ["大气稳重", "胸襟开阔", "优质紫砂", "230ml容量", "收藏佳品"],
  ["独特造型", "古乐器灵感", "200ml容量", "音韵悠扬", "艺术性强"],
  ["稳重造型", "古权在握", "210ml容量", "寓意权威", "收藏价值"],
  ["清代经典", "文人气息", "200ml容量", "品茶赏壶", "艺术价值"],
  ["大师之作", "工艺精湛", "220ml容量", "收藏极品", "传承经典"],
  ["诗书画印", "文气盎然", "190ml容量", "文人雅士", "收藏佳品"],
  ["紫砂壶鼻祖", "古朴自然", "200ml容量", "历史悠久", "收藏价值"],
  ["圆润可爱", "寓意吉祥", "180ml容量", "造型生动", "送礼佳品"],
  ["线条优美", "秀气典雅", "170ml容量", "造型独特", "越用越美"],
  ["造型独特", "禅意十足", "200ml容量", "寓意深远", "收藏佳品"],
  ["和和美美", "团圆美满", "210ml容量", "家庭使用", "寓意美好"],
  ["清代款式", "造型独特", "190ml容量", "深受喜爱", "越养越美"],
  ["造型生动", "意趣盎然", "180ml容量", "自然有趣", "送礼佳品"],
  ["福禄双全", "吉祥如意", "200ml容量", "造型生动", "寓意美好"],
  ["高风亮节", "品格高尚", "190ml容量", "造型独特", "收藏佳品"],
  ["傲雪凌霜", "坚韧不拔", "180ml容量", "造型优美", "送礼佳品"],
  ["田园气息", "生动有趣", "210ml容量", "造型独特", "越用越美"],
  ["吉祥如意", "健康长寿", "190ml容量", "造型生动", "寓意美好"],
  ["福寿双全", "造型独特", "200ml容量", "寓意美好", "收藏佳品"],
  ["苍劲有力", "寓意长寿", "220ml容量", "造型独特", "收藏价值"],
  ["苍劲古朴", "寓意坚韧", "200ml容量", "造型独特", "收藏佳品"],
  ["古朴自然", "返璞归真", "190ml容量", "造型独特", "收藏价值"],
  ["生动有趣", "意趣盎然", "180ml容量", "造型生动", "送礼佳品"],
  ["鲤鱼跃龙门", "飞黄腾达", "210ml容量", "造型生动", "寓意美好"],
  ["龙腾云起", "气势磅礴", "220ml容量", "造型精美", "收藏佳品"],
  ["龙凤呈祥", "吉祥如意", "200ml容量", "造型精美", "送礼佳品"],
  ["百福临门", "吉祥如意", "190ml容量", "寓意美好", "收藏佳品"],
  ["长命百岁", "健康长寿", "210ml容量", "寓意吉祥", "送礼佳品"],
  ["万事如意", "心想事成", "190ml容量", "造型优美", "收藏佳品"],
  ["祥云瑞气", "吉祥如意", "200ml容量", "造型生动", "寓意美好"],
  ["连绵不断", "富贵不断", "180ml容量", "传统工艺", "收藏佳品"],
  ["团结一心", "不离不弃", "190ml容量", "造型独特", "送礼佳品"],
  ["简洁大方", "时尚典雅", "200ml容量", "现代设计", "越用越美"],
  ["返璞归真", "本色之美", "210ml容量", "素面朝天", "收藏佳品"],
  ["诗词刻字", "文气盎然", "190ml容量", "文人雅士", "收藏佳品"],
  ["山水花鸟", "生动如画", "200ml容量", "艺术价值", "收藏佳品"],
  ["泥绘工艺", "色彩丰富", "180ml容量", "精美绝伦", "送礼佳品"],
  ["描金工艺", "金碧辉煌", "200ml容量", "华贵典雅", "收藏佳品"],
  ["镶银工艺", "高贵典雅", "190ml容量", "精美独特", "收藏佳品"],
  ["包铜工艺", "古色古香", "210ml容量", "韵味十足", "收藏佳品"],
  ["嵌玉工艺", "华贵非凡", "200ml容量", "精美绝伦", "送礼佳品"],
  ["开光装饰", "层次感强", "190ml容量", "造型优美", "收藏佳品"],
  ["四方造型", "稳重端庄", "200ml容量", "寓意正直", "收藏佳品"],
  ["六方造型", "六六大顺", "210ml容量", "独特美观", "送礼佳品"],
  ["八方造型", "八方来财", "200ml容量", "精美绝伦", "收藏佳品"]
];

const prices = [299, 399, 499, 599, 699, 799, 899, 999, 1299, 1599, 1899, 2199, 2599, 2999, 3499, 3999, 4499, 4999, 5499, 5999];
const categories = ["1", "1", "1", "1", "1", "2", "2", "2", "3", "3", "3", "4", "4", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1"];

export async function POST(request: NextRequest) {
  try {
    await query('BEGIN');
    await query('DELETE FROM products');

    const products = [];
    
    for (let i = 0; i < 50; i++) {
      const imgIndex = i % zishaTeapotImages.length;
      const nameIndex = i % teapotNames.length;
      const descIndex = i % teapotDescriptions.length;
      const featIndex = i % teapotFeatures.length;
      const priceIndex = i % prices.length;
      const catIndex = i % categories.length;
      
      const price = prices[priceIndex];
      const original_price = Math.round(price * (1 + (Math.random() * 0.3 + 0.1)));
      const discount = Math.round(((original_price - price) / original_price) * 100);
      
      products.push({
        id: i + 1,
        name: teapotNames[nameIndex],
        name_en: `${teapotNames[nameIndex]} Zisha Teapot`,
        name_ar: `إبوة زيشا ${teapotNames[nameIndex]}`,
        price: price,
        original_price: original_price,
        stock: Math.floor(Math.random() * 80) + 20,
        category_id: categories[catIndex],
        image: zishaTeapotImages[imgIndex].main,
        images: zishaTeapotImages[imgIndex].gallery,
        video: i === 0 ? "https://www.w3schools.com/html/mov_bbb.mp4" : null,
        description: teapotDescriptions[descIndex],
        features: teapotFeatures[featIndex],
        is_limited: i % 5 === 0,
        discount: discount
      });
    }

    for (const product of products) {
      await query(
        `INSERT INTO products (id, name, name_en, name_ar, price, original_price, stock, category_id, image, images, video, description, features, is_limited, discount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          product.video,
          product.description,
          JSON.stringify(product.features),
          product.is_limited ? 1 : 0,
          product.discount
        ]
      );
    }

    await query('COMMIT');

    return NextResponse.json({ message: 'Products seeded successfully', count: products.length });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error seeding products:', error);
    return NextResponse.json({ error: 'Failed to seed products' }, { status: 500 });
  }
}
