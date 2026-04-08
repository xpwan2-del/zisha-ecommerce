import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 为每个类目生成相关的图片URL，确保每张图片角度不同
const generateCategoryImages = (category: string, count: number) => {
  const images = [];
  // 不同角度的描述
  const angles = [
    'front view',
    'side view',
    'top view',
    'detail close-up',
    'in use with tea',
    'traditional setting'
  ];
  
  for (let i = 1; i <= count; i++) {
    const gallery = [];
    for (let j = 0; j < 6; j++) {
      let prompt = '';
      switch (category) {
        case '紫砂壶':
          prompt = `Yixing zisha teapot traditional Chinese pottery ${angles[j]} ${i} professional photography`;
          break;
        case '茶杯':
          prompt = `Zisha tea cups set traditional Chinese ${angles[j]} ${i} professional photography`;
          break;
        case '茶叶罐':
          prompt = `Tea caddy zisha pottery ${angles[j]} ${i} professional photography`;
          break;
        case '套装':
          prompt = `Complete zisha tea set with teapot and cups ${angles[j]} ${i} professional photography`;
          break;
      }
      const encodedPrompt = encodeURIComponent(prompt);
      gallery.push(`https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodedPrompt}&image_size=square`);
    }
    images.push({
      main: gallery[0],
      gallery
    });
  }
  return images;
};

// 生成产品数据
const generateProducts = () => {
  const categories = [
    { id: 1, name: "紫砂壶", count: 15 },
    { id: 2, name: "茶杯", count: 15 },
    { id: 3, name: "茶叶罐", count: 15 },
    { id: 4, name: "套装", count: 15 }
  ];
  
  const products: any[] = [];
  let productId = 1;
  
  categories.forEach(category => {
    const categoryImages = generateCategoryImages(category.name, category.count);
    
    for (let i = 0; i < category.count; i++) {
      const price = Math.floor(Math.random() * 2000) + 299;
      const originalPrice = Math.round(price * (1 + (Math.random() * 0.3 + 0.1)));
      const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
      
      let productName = '';
      let description = '';
      let features: string[] = [];
      
      switch (category.name) {
        case '紫砂壶':
          const teapotTypes = ['西施', '石瓢', '仿古', '掇球', '容天', '汉铎', '秦权', '子冶石瓢', '景舟石瓢', '曼生壶', '供春', '龙蛋', '梨形', '僧帽', '合欢'];
          productName = `${productId}. 宜兴紫砂壶 ${teapotTypes[i]}款`;
          description = `采用正宗宜兴原矿紫砂泥，手工制作而成。${teapotTypes[i]}壶造型独特，出水流畅，是品茶爱好者的首选。`;
          features = ['正宗宜兴原矿紫砂', '手工制作', '200ml容量', '耐高温', '越用越润'];
          break;
        case '茶杯':
          const cupTypes = ['品茗杯', '功夫茶杯', '主人杯', '斗笠杯', '铃铛杯', '鸡心杯', '卧足杯', '高足杯', '直筒杯', '撇口杯', '收口杯', '鼓腹杯', '折沿杯', '葵口杯', '莲花杯'];
          productName = `${productId}. 紫砂${cupTypes[i]} 套装`;
          description = `采用优质紫砂泥制作，质感细腻，透气性好。${cupTypes[i]}造型优美，适合品饮各种茶叶。`;
          features = ['优质紫砂泥', '细腻质感', '透气性好', '100ml容量', '易清洗'];
          break;
        case '茶叶罐':
          const caddyTypes = ['密封罐', '存储罐', '醒茶罐', '便携罐', '复古罐', '现代罐', '大容量罐', '小容量罐', '带盖罐', '陶瓷罐', '紫砂罐', '竹编罐', '木罐', '金属罐', '玻璃罐'];
          productName = `${productId}. 紫砂${caddyTypes[i]}`;
          description = `采用优质紫砂泥制作，密封性能好，适合存储茶叶。${caddyTypes[i]}造型美观，实用性强。`;
          features = ['优质紫砂泥', '密封性能好', '防潮防虫', '美观实用', '易于保养'];
          break;
        case '套装':
          const setTypes = ['经典套装', '豪华套装', '旅行套装', '家庭套装', '商务套装', '礼品套装', '收藏套装', '入门套装', '大师套装', '限量套装', '定制套装', '传统套装', '现代套装', '精品套装', '尊享套装'];
          productName = `${productId}. 紫砂茶具${setTypes[i]}`;
          description = `包含茶壶、茶杯、茶盘等全套茶具，采用优质紫砂泥制作，工艺精湛，是品茶和送礼的绝佳选择。`;
          features = ['全套茶具', '优质紫砂泥', '工艺精湛', '送礼佳品', '收藏价值'];
          break;
      }
      
      // 为一些产品添加今日特惠
      let dailyDiscount = 0;
      let dailyDiscountStartTime = '';
      let dailyDiscountEndTime = '';
      if (i % 3 === 0) {
        dailyDiscount = Math.floor(Math.random() * 30) + 10; // 10-40%
        dailyDiscountStartTime = new Date().toISOString();
        const endTime = new Date();
        endTime.setHours(23, 59, 59, 999);
        dailyDiscountEndTime = endTime.toISOString();
      }
      
      products.push({
        name: productName,
        name_en: `${productName} (Zisha)`,
        name_ar: `إبوة زيشا ${productName}`,
        price: price,
        original_price: originalPrice,
        stock: Math.floor(Math.random() * 80) + 20,
        category_id: category.id,
        image: categoryImages[i].main,
        images: categoryImages[i].gallery,
        video: i === 0 ? "https://www.w3schools.com/html/mov_bbb.mp4" : null,
        description: description,
        features: features,
        is_limited: i % 5 === 0,
        discount: discount,
        daily_discount: dailyDiscount,
        daily_discount_start_time: dailyDiscountStartTime,
        daily_discount_end_time: dailyDiscountEndTime,
        display_mode: i % 3 === 0 ? 'single' : 'double'
      });
      
      productId++;
    }
  });
  
  return products;
};

export async function POST(request: NextRequest) {
  try {
    console.log('开始导入产品数据...');
    
    // 检查categories表数据
    const categoriesResult = await query('SELECT * FROM categories');
    console.log('Categories:', categoriesResult.rows);
    
    // 先删除引用products表的表数据
    console.log('删除引用表数据...');
    await query('DELETE FROM order_items');
    await query('DELETE FROM product_activities');
    await query('DELETE FROM reviews');
    await query('DELETE FROM recommendations');
    console.log('引用表数据删除完成');
    
    // 删除产品数据
    console.log('删除现有产品数据...');
    await query('DELETE FROM products');
    console.log('产品数据删除完成');

    const products = generateProducts();
    console.log(`生成了 ${products.length} 个产品`);
    
    // 先删除现有产品数据
    await query('DELETE FROM products');
    console.log('已删除现有产品数据');
    
    // 插入产品数据
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      try {
        await query(
          `INSERT INTO products (name, name_en, name_ar, price, original_price, stock, category_id, image, description, is_limited, discount, daily_discount, daily_discount_start_time, daily_discount_end_time, display_mode)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            product.name,
            product.name_en,
            product.name_ar,
            product.price,
            product.original_price,
            product.stock,
            product.category_id,
            product.image,
            product.description,
            product.is_limited ? 1 : 0,
            product.discount,
            product.daily_discount,
            product.daily_discount_start_time,
            product.daily_discount_end_time,
            product.display_mode
          ]
        );
        if (i % 10 === 0) {
          console.log(`已插入 ${i} 个产品`);
        }
      } catch (error) {
        console.error(`插入产品 ${product.name} 失败:`, error);
      }
    }

    console.log('所有产品插入成功');
    return NextResponse.json({ message: 'Products seeded successfully', count: products.length });
  } catch (error) {
    console.error('Error seeding products:', error);
    return NextResponse.json({ error: 'Failed to seed products', details: error }, { status: 500 });
  }
}