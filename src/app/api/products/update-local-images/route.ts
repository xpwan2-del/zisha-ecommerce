import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
/**
 * @api {GET} /api/products/update-local-images 更新本地图片
 * @apiName UpdateLocalImages
 * @apiGroup PRODUCTS
 * @apiDescription 根据产品名称关键词更新本地图片路径。
 */


// 产品名称关键词到图片文件名的映射（按优先级排序，越具体的匹配越靠前）
// 注意：文件名格式为 1_xxx.jpg 而不是 01_xxx.jpg
const productImageMap: { [key: string]: string } = {
  // 紫砂壶具体款式 (1-15)
  '西施': '1_西施紫砂壶',
  '石瓢': '2_石瓢紫砂壶',
  '仿古': '3_仿古紫砂壶',
  '井栏': '4_井栏紫砂壶',
  '掇球': '5_掇球紫砂壶',
  '提梁': '6_提梁紫砂壶',
  '龙蛋': '7_龙蛋紫砂壶',
  '水平': '8_水平紫砂壶',
  '容天': '9_容天紫砂壶',
  '福临': '10_福临紫砂壶',
  '思亭': '11_思亭紫砂壶',
  '乳鼎': '12_乳鼎紫砂壶',
  '汉扁': '13_汉扁紫砂壶',
  '柱楚': '14_柱楚紫砂壶',
  '平盖': '15_平盖紫砂壶',
  '汉铎': '2_石瓢紫砂壶',
  '秦权': '3_仿古紫砂壶',
  '子冶': '2_石瓢紫砂壶',
  '景舟': '2_石瓢紫砂壶',
  '曼生': '1_西施紫砂壶',
  '供春': '4_井栏紫砂壶',
  '梨形': '5_掇球紫砂壶',
  '僧帽': '6_提梁紫砂壶',
  '合欢': '7_龙蛋紫砂壶',
  
  // 紫砂茶杯具体款式 (16-24)
  '品茗杯': '16_紫砂品茗杯',
  '闻香杯': '17_紫砂闻香杯',
  '功夫杯': '18_紫砂功夫杯',
  '主人杯': '19_紫砂主人杯',
  '客杯': '20_紫砂客杯',
  '公道杯': '21_紫砂公道杯',
  '普洱杯': '22_紫砂普洱杯',
  '绿茶杯': '23_紫砂绿茶杯',
  '红茶杯': '24_紫砂红茶杯',
  '功夫茶杯': '18_紫砂功夫杯',
  '斗笠杯': '19_紫砂主人杯',
  '铃铛杯': '20_紫砂客杯',
  '鸡心杯': '21_紫砂公道杯',
  '卧足杯': '22_紫砂普洱杯',
  '高足杯': '23_紫砂绿茶杯',
  '直筒杯': '16_紫砂品茗杯',
  '撇口杯': '17_紫砂闻香杯',
  '收口杯': '18_紫砂功夫杯',
  '鼓腹杯': '19_紫砂主人杯',
  '折沿杯': '20_紫砂客杯',
  '葵口杯': '21_紫砂公道杯',
  '莲花杯': '22_紫砂普洱杯',
  
  // 紫砂茶叶罐 (25-30)
  '茶叶罐-圆形': '25_紫砂茶叶罐-圆形',
  '茶叶罐-方形': '26_紫砂茶叶罐-方形',
  '醒茶罐': '27_紫砂醒茶罐',
  '储茶罐-大号': '28_紫砂储茶罐-大号',
  '储茶罐-中号': '29_紫砂储茶罐-中号',
  '储茶罐-小号': '30_紫砂储茶罐-小号',
  '密封罐': '25_紫砂茶叶罐-圆形',
  '存储罐': '28_紫砂储茶罐-大号',
  '便携罐': '30_紫砂储茶罐-小号',
  
  // 套装 (31-36)
  '套组-基础款': '31_紫砂套组-基础款',
  '套组-进阶款': '32_紫砂套组-进阶款',
  '套组-豪华款': '33_紫砂套组-豪华款',
  '功夫茶具套装': '34_功夫茶具套装',
  '普洱茶具套装': '35_普洱茶具套装',
  '礼品茶具套装': '36_礼品茶具套装',
  
  // 茶具套装 (37-41)
  '一壶两杯': '37_一壶两杯套装',
  '一壶四杯': '38_一壶四杯套装',
  '旅行茶具': '39_旅行茶具套装',
  '功夫茶具': '40_功夫茶具套装',
  '茶盘茶具': '41_茶盘茶具套装',
  
  // 紫砂配件 (42-50)
  '茶漏': '42_紫砂茶漏',
  '茶宠': '43_紫砂茶宠-貔貅',
  '茶夹': '44_紫砂茶夹',
  '茶匙': '45_紫砂茶匙',
  '茶漏托架': '46_紫砂茶漏托架',
  '茶垫': '47_紫砂茶垫',
  '茶则': '48_紫砂茶则',
  '茶针': '49_紫砂茶针',
  '茶拨': '50_紫砂茶拨',
  
  // 通用匹配（放在最后，优先级最低）
  '紫砂壶': '1_西施紫砂壶',
  '茶杯': '16_紫砂品茗杯',
  '茶叶罐': '25_紫砂茶叶罐-圆形',
  '茶具套装': '31_紫砂套组-基础款',
  '套组': '31_紫砂套组-基础款',
  '紫砂': '1_西施紫砂壶',
};

export async function POST(request: NextRequest) {
  try {
    // 获取所有产品
    const productsResult = await query('SELECT id, name FROM products');
    const products = productsResult.rows;
    
    let updatedCount = 0;
    const updatedProducts = [];
    const failedProducts = [];
    
    for (const product of products) {
      const productName = product.name;
      
      // 查找匹配的图片前缀
      let imagePrefix = null;
      for (const [keyword, prefix] of Object.entries(productImageMap)) {
        if (productName.includes(keyword)) {
          imagePrefix = prefix;
          break;
        }
      }
      
      if (imagePrefix) {
        // 构建本地图片路径
        const basePath = '/images/products';
        const images = [];
        
        // 生成6张图片的路径
        for (let i = 1; i <= 6; i++) {
          images.push(`${basePath}/${imagePrefix}_${i}.jpg`);
        }
        
        // 更新数据库
        await query(
          'UPDATE products SET image = ?, images = ? WHERE id = ?',
          [images[0], JSON.stringify(images), product.id]
        );
        
        updatedCount++;
        updatedProducts.push({
          id: product.id,
          name: productName,
          image: images[0],
          images: images
        });
      } else {
        failedProducts.push({
          id: product.id,
          name: productName,
          reason: '未找到匹配的图片'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      updatedCount,
      totalProducts: products.length,
      updatedProducts: updatedProducts.slice(0, 10),
      failedProducts: failedProducts.slice(0, 10),
      message: `成功更新 ${updatedCount} 个产品的图片路径`
    });
    
  } catch (error: any) {
    console.error('Error updating local images:', error);
    return NextResponse.json({
      success: false,
      error: '更新图片路径失败',
      details: error.message
    }, { status: 500 });
  }
}

// 获取当前图片路径状态
export async function GET(request: NextRequest) {
  try {
    const productsResult = await query('SELECT id, name, image, images FROM products LIMIT 10');
    
    return NextResponse.json({
      success: true,
      products: productsResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        currentImage: row.image,
        currentImages: row.images ? JSON.parse(row.images) : []
      }))
    });
    
  } catch (error: any) {
    console.error('Error fetching image status:', error);
    return NextResponse.json({
      success: false,
      error: '获取图片状态失败',
      details: error.message
    }, { status: 500 });
  }
}
