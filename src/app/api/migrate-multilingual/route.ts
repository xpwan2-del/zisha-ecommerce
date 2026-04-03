import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST() {
  try {
    // 获取about表的列信息
    const aboutTableInfo = await query(`PRAGMA table_info(about)`);
    const aboutColumns = aboutTableInfo.rows.map((row: any) => row.name);
    
    // 添加多语言字段到 about 表
    if (!aboutColumns.includes('title_en')) {
      await query(`ALTER TABLE about ADD COLUMN title_en VARCHAR(255)`);
    }
    if (!aboutColumns.includes('title_ar')) {
      await query(`ALTER TABLE about ADD COLUMN title_ar VARCHAR(255)`);
    }
    if (!aboutColumns.includes('description_en')) {
      await query(`ALTER TABLE about ADD COLUMN description_en TEXT`);
    }
    if (!aboutColumns.includes('description_ar')) {
      await query(`ALTER TABLE about ADD COLUMN description_ar TEXT`);
    }
    if (!aboutColumns.includes('content_en')) {
      await query(`ALTER TABLE about ADD COLUMN content_en TEXT`);
    }
    if (!aboutColumns.includes('content_ar')) {
      await query(`ALTER TABLE about ADD COLUMN content_ar TEXT`);
    }

    // 获取contact表的列信息
    const contactTableInfo = await query(`PRAGMA table_info(contact)`);
    const contactColumns = contactTableInfo.rows.map((row: any) => row.name);
    
    // 添加多语言字段到 contact 表
    if (!contactColumns.includes('title_en')) {
      await query(`ALTER TABLE contact ADD COLUMN title_en VARCHAR(255)`);
    }
    if (!contactColumns.includes('title_ar')) {
      await query(`ALTER TABLE contact ADD COLUMN title_ar VARCHAR(255)`);
    }
    if (!contactColumns.includes('description_en')) {
      await query(`ALTER TABLE contact ADD COLUMN description_en TEXT`);
    }
    if (!contactColumns.includes('description_ar')) {
      await query(`ALTER TABLE contact ADD COLUMN description_ar TEXT`);
    }
    if (!contactColumns.includes('address_en')) {
      await query(`ALTER TABLE contact ADD COLUMN address_en TEXT`);
    }
    if (!contactColumns.includes('address_ar')) {
      await query(`ALTER TABLE contact ADD COLUMN address_ar TEXT`);
    }
    if (!contactColumns.includes('opening_hours_en')) {
      await query(`ALTER TABLE contact ADD COLUMN opening_hours_en TEXT`);
    }
    if (!contactColumns.includes('opening_hours_ar')) {
      await query(`ALTER TABLE contact ADD COLUMN opening_hours_ar TEXT`);
    }

    // 更新现有的about数据，添加多语言内容
    const aboutResult = await query('SELECT * FROM about LIMIT 1');
    if (aboutResult.rows.length > 0) {
      const about = aboutResult.rows[0];
      await query(`
        UPDATE about SET
          title_en = ?,
          title_ar = ?,
          description_en = ?,
          description_ar = ?,
          content_en = ?,
          content_ar = ?
        WHERE id = ?
      `, [
        'About Us',
        'عنّا',
        'Learn about our zisha pottery craftsmanship',
        'تعرف على حرفتنا في فخار زيشا',
        'Our zisha pottery is handcrafted by skilled artisans using traditional techniques that have been passed down for generations. Each piece is unique and carries the essence of Chinese culture and craftsmanship.',
        'يتم صناعة فخار زيشا يدويًا بواسطة حرفيين مهرة باستخدام تقنيات تقليدية تم تمريرها عبر الأجيال. كل قطعة فريدة وتحمل جوهر الثقافة والحرفية الصينية.',
        about.id
      ]);
    }

    // 更新现有的contact数据，添加多语言内容
    const contactResult = await query('SELECT * FROM contact LIMIT 1');
    if (contactResult.rows.length > 0) {
      const contact = contactResult.rows[0];
      await query(`
        UPDATE contact SET
          title_en = ?,
          title_ar = ?,
          description_en = ?,
          description_ar = ?,
          address_en = ?,
          address_ar = ?,
          opening_hours_en = ?,
          opening_hours_ar = ?
        WHERE id = ?
      `, [
        'Contact Us',
        'اتصل بنا',
        'Get in touch with us',
        'تواصل معنا',
        contact.address || 'Yixing, Jiangsu, China',
        'يشينغ، جيانغسو، الصين',
        contact.opening_hours || 'Monday - Friday: 9:00 AM - 6:00 PM',
        'الإثنين - الجمعة: 9:00 صباحًا - 6:00 مساءً',
        contact.id
      ]);
    }

    return NextResponse.json({ 
      message: 'Database migration completed successfully',
      changes: [
        'Added multilingual fields to about table',
        'Added multilingual fields to contact table',
        'Updated existing data with multilingual content'
      ]
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error 
    }, { status: 500 });
  }
}
