import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/about - Get about information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'zh';
    
    const result = await query('SELECT * FROM about LIMIT 1');
    
    let about = result.rows[0];
    
    if (!about) {
      // Create default about if not exists
      const defaultAbout = {
        title: '关于我们',
        title_en: 'About Us',
        title_ar: 'عنّا',
        description: '了解我们的紫砂陶艺工艺',
        description_en: 'Learn about our zisha pottery craftsmanship',
        description_ar: 'تعرف على حرفتنا في فخار زيشا',
        images: [
          'https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop'
        ],
        video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        content: '我们的紫砂陶艺由技艺精湛的工匠手工制作，采用代代相传的传统工艺。每一件作品都独一无二，承载着中国文化和工艺的精髓。',
        content_en: 'Our zisha pottery is handcrafted by skilled artisans using traditional techniques that have been passed down for generations. Each piece is unique and carries the essence of Chinese culture and craftsmanship.',
        content_ar: 'يتم صناعة فخار زيشا يدويًا بواسطة حرفيين مهرة باستخدام تقنيات تقليدية تم تمريرها عبر الأجيال. كل قطعة فريدة وتحمل جوهر الثقافة والحرفية الصينية.'
      };
      
      const insertResult = await query(
        'INSERT INTO about (title, title_en, title_ar, description, description_en, description_ar, images, video_url, content, content_en, content_ar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *',
        [
          defaultAbout.title,
          defaultAbout.title_en,
          defaultAbout.title_ar,
          defaultAbout.description,
          defaultAbout.description_en,
          defaultAbout.description_ar,
          JSON.stringify(defaultAbout.images),
          defaultAbout.video_url,
          defaultAbout.content,
          defaultAbout.content_en,
          defaultAbout.content_ar
        ]
      );
      
      about = insertResult.rows[0];
    }

    // 根据语言返回对应的内容
    const response = {
      ...about,
      title: lang === 'en' ? about.title_en : lang === 'ar' ? about.title_ar : about.title,
      description: lang === 'en' ? about.description_en : lang === 'ar' ? about.description_ar : about.description,
      content: lang === 'en' ? about.content_en : lang === 'ar' ? about.content_ar : about.content,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting about information:', error);
    return NextResponse.json({ error: 'Failed to get about information' }, { status: 500 });
  }
}

// POST /api/about - Update about information
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { 
      title, title_en, title_ar,
      description, description_en, description_ar,
      images, 
      videoUrl, 
      content, content_en, content_ar 
    } = data;
    
    // Use UPSERT logic - update if exists, insert if not
    const result = await query(`
      INSERT INTO about (title, title_en, title_ar, description, description_en, description_ar, images, video_url, content, content_en, content_ar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        title_en = excluded.title_en,
        title_ar = excluded.title_ar,
        description = excluded.description,
        description_en = excluded.description_en,
        description_ar = excluded.description_ar,
        images = excluded.images,
        video_url = excluded.video_url,
        content = excluded.content,
        content_en = excluded.content_en,
        content_ar = excluded.content_ar
      RETURNING *
    `, [
      title,
      title_en,
      title_ar,
      description,
      description_en,
      description_ar,
      JSON.stringify(images),
      videoUrl,
      content,
      content_en,
      content_ar
    ]);
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating about information:', error);
    return NextResponse.json({ error: 'Failed to update about information' }, { status: 500 });
  }
}
