import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST() {
  try {
    const existingReviews = await query('SELECT COUNT(*) as count FROM reviews');
    if (existingReviews.rows && existingReviews.rows[0] && existingReviews.rows[0].count && Number(existingReviews.rows[0].count) > 0) {
      return NextResponse.json({ 
        message: 'Reviews already exist',
        count: existingReviews.rows[0].count
      });
    }

    const products = await query('SELECT id FROM products LIMIT 4');
    if (!products.rows || products.rows.length === 0) {
      return NextResponse.json({ 
        error: 'No products found. Please seed products first.' 
      }, { status: 400 });
    }

    const productIds = products.rows.map((p: any) => p.id);

    const sampleReviews = [
      {
        product_id: productIds[0] || 1,
        user_id: null,
        rating: 5,
        comment: '这是我购买的第一个紫砂壶，质量非常好，手感细腻，泡茶效果很棒。客服服务也很专业，会再次购买。',
        comment_en: 'This is my first zisha teapot purchase. The quality is excellent, the texture is smooth, and it brews tea beautifully. Customer service was very professional. Will buy again.',
        comment_ar: 'هذه أول عملية شراء لي لإبريق زيشا. الجودة ممتازة والملمس ناعم ويخمر الشاي بشكل جميل. خدمة العملاء كانت احترافية جداً. سأشتري مرة أخرى.',
        images: JSON.stringify([
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=customer%20photo%20of%20zisha%20teapot%20on%20tea%20table%20realistic%20casual%20shot&image_size=square_hd',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20in%20use%20pouring%20tea%20customer%20photo&image_size=square_hd'
        ])
      },
      {
        product_id: productIds[1] || productIds[0] || 1,
        user_id: null,
        rating: 5,
        comment: '定制的紫砂壶非常满意，做工精细，造型美观，是一件艺术品。物流速度也很快，包装很严实。',
        comment_en: 'Very satisfied with the custom zisha teapot. Fine workmanship, beautiful design, it\'s a work of art. Fast shipping and secure packaging.',
        comment_ar: 'راضٍ جداً عن إبريق زيشا المخصص. الصناعة دقيقة والتصميم جميل، إنه عمل فني. الشحن سريع والتغليف آمن.',
        images: JSON.stringify([
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20zisha%20teapot%20on%20display%20shelf%20customer%20photo&image_size=square_hd',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20packaging%20box%20opened%20customer%20photo&image_size=square_hd'
        ])
      },
      {
        product_id: productIds[2] || productIds[0] || 1,
        user_id: null,
        rating: 4,
        comment: '产品质量不错，价格合理，就是配送时间稍微长了一点。总体来说是一次愉快的购物体验。',
        comment_en: 'Good product quality at a reasonable price. Delivery took a bit longer than expected, but overall a pleasant shopping experience.',
        comment_ar: 'جودة المنتج جيدة والسعر معقول. التوصيل استغرق وقتاً أطول قليلاً من المتوقع، لكن بشكل عام تجربة تسوق ممتعة.',
        images: JSON.stringify([
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20cups%20on%20table%20customer%20photo%20casual&image_size=square_hd'
        ])
      },
      {
        product_id: productIds[0] || 1,
        user_id: null,
        rating: 5,
        comment: '紫砂壶的泥料非常好，透气性强，泡出的茶汤醇厚。店家还送了茶具配件，很贴心。',
        comment_en: 'The clay quality of this zisha teapot is excellent with great breathability. The tea brewed is rich and mellow. The shop also included free tea accessories, very thoughtful.',
        comment_ar: 'جودة طين زيشا ممتازة مع نفاذية رائعة. الشاي المخمر غني وناعم. أضاف المتجر أيضاً ملحقات شاي مجانية، لطف جداً.',
        images: JSON.stringify([
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20with%20tea%20accessories%20customer%20photo&image_size=square_hd',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tea%20ceremony%20setup%20with%20zisha%20teapot%20casual%20photo&image_size=square_hd',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=close%20up%20of%20zisha%20teapot%20texture%20customer%20photo&image_size=square_hd'
        ])
      },
      {
        product_id: productIds[1] || productIds[0] || 1,
        user_id: null,
        rating: 5,
        comment: '第三次购买了，每次都很满意。这个西施壶造型特别优美，出水流畅，是收藏和使用的佳品。',
        comment_en: 'Third purchase, always satisfied. This Xi Shi teapot has a particularly elegant shape with smooth water flow. Perfect for both collection and use.',
        comment_ar: 'الشراء الثالث، دائماً راضٍ. إبريق شي شي له شكل أنيق بشكل خاص مع تدفق مياه سلس. مثالي للجمع والاستخدام.',
        images: JSON.stringify([
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=elegant%20xi%20shi%20zisha%20teapot%20on%20wooden%20stand%20customer%20photo&image_size=square_hd',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20pouring%20water%20action%20shot%20customer%20photo&image_size=square_hd'
        ])
      },
      {
        product_id: productIds[3] || productIds[0] || 1,
        user_id: null,
        rating: 5,
        comment: '茶叶罐密封性很好，容量适中，外观也很漂亮。用来存普洱茶非常合适。',
        comment_en: 'The tea caddy has excellent sealing, moderate capacity, and beautiful appearance. Perfect for storing Pu-erh tea.',
        comment_ar: 'علبة الشاي لديها إغلاق ممتاز وسعة معتدلة ومظهر جميل. مثالية لتخزين شاي بوير.',
        images: JSON.stringify([
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20caddy%20with%20tea%20leaves%20customer%20photo&image_size=square_hd',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20tea%20storage%20jar%20zisha%20customer%20photo&image_size=square_hd'
        ])
      }
    ];

    for (const review of sampleReviews) {
      await query(
        'INSERT INTO reviews (product_id, user_id, rating, comment, comment_en, comment_ar, images) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [review.product_id, review.user_id, review.rating, review.comment, review.comment_en, review.comment_ar, review.images]
      );
    }

    return NextResponse.json({ 
      message: 'Sample reviews created successfully',
      count: sampleReviews.length,
      productIds: productIds
    });
  } catch (error: any) {
    console.error('Error initializing reviews:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize reviews', 
      details: error.message || error,
      stack: error.stack
    }, { status: 500 });
  }
}
