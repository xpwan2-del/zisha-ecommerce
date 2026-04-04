import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST() {
  try {
    // 获取所有产品
    const result = await query('SELECT id, name FROM products');
    const products = result.rows;

    // 为每个产品生成AI图片
    const updatedProducts = [];
    
    for (const product of products) {
      const productName = String(product.name || '');
      
      // 根据产品名称生成不同的prompt
      let prompt = '';
      
      if (productName.includes('石瓢')) {
        prompt = 'traditional%20chinese%20yixing%20zisha%20teapot%20shi%20piao%20style%20purple%20clay%20pottery%20professional%20product%20photography';
      } else if (productName.includes('西施')) {
        prompt = 'traditional%20chinese%20yixing%20zisha%20teapot%20xi%20shi%20style%20elegant%20round%20shape%20purple%20clay';
      } else if (productName.includes('仿古')) {
        prompt = 'chinese%20yixing%20zisha%20teapot%20fang%20gu%20style%20antique%20purple%20clay%20pottery';
      } else if (productName.includes('井栏')) {
        prompt = 'yixing%20zisha%20teapot%20jing%20lan%20style%20square%20shape%20purple%20clay';
      } else if (productName.includes('掇球')) {
        prompt = 'chinese%20zisha%20teapot%20duo%20qiu%20style%20stacked%20sphere%20purple%20clay';
      } else if (productName.includes('提梁')) {
        prompt = 'yixing%20zisha%20teapot%20with%20overhead%20handle%20traditional%20chinese%20purple%20clay';
      } else if (productName.includes('茶杯') || productName.includes('杯')) {
        prompt = 'chinese%20zisha%20tea%20cup%20purple%20clay%20traditional%20handmade%20teacup';
      } else if (productName.includes('茶叶罐') || productName.includes('罐')) {
        prompt = 'chinese%20zisha%20tea%20caddy%20purple%20clay%20container%20traditional%20pottery';
      } else if (productName.includes('套装')) {
        prompt = 'chinese%20zisha%20tea%20set%20complete%20teapot%20and%20cups%20purple%20clay';
      } else if (productName.includes('方') || productName.includes('四方') || productName.includes('六方') || productName.includes('八方')) {
        prompt = 'chinese%20zisha%20teapot%20geometric%20square%20shape%20purple%20clay%20modern%20design';
      } else if (productName.includes('花') || productName.includes('竹') || productName.includes('梅')) {
        prompt = 'chinese%20zisha%20teapot%20with%20flower%20bamboo%20plum%20blossom%20carving%20purple%20clay';
      } else if (productName.includes('刻') || productName.includes('绘') || productName.includes('描金')) {
        prompt = 'chinese%20zisha%20teapot%20with%20intricate%20carving%20engraving%20purple%20clay%20artistic';
      } else {
        // 默认紫砂壶
        prompt = 'traditional%20chinese%20yixing%20zisha%20teapot%20purple%20clay%20pottery%20handmade%20craftsmanship';
      }
      
      // 生成主图和多张细节图
      const mainImage = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${prompt}&image_size=square_hd`;
      const images = [
        mainImage,
        `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${prompt}%20close%20up%20detail&image_size=square_hd`,
        `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${prompt}%20side%20view&image_size=square_hd`
      ];
      
      // 更新产品图片
      await query(
        'UPDATE products SET image = ?, images = ? WHERE id = ?',
        [mainImage, JSON.stringify(images), product.id]
      );
      
      updatedProducts.push({
        id: product.id,
        name: productName,
        image: mainImage
      });
    }

    return NextResponse.json({ 
      message: 'All product images updated with AI-generated zisha images',
      updated: updatedProducts.length,
      products: updatedProducts
    });
  } catch (error) {
    console.error('Error updating product images:', error);
    return NextResponse.json({ 
      error: 'Failed to update product images', 
      details: error 
    }, { status: 500 });
  }
}
