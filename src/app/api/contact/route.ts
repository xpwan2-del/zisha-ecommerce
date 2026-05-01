import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

// GET /api/contact - Get contact information
export async function GET() {
  try {
    logMonitor('CONTACT', 'REQUEST', { method: 'GET', action: 'GET_CONTACT' });

    const result = await query('SELECT * FROM contact LIMIT 1');
    
    let contact = result.rows[0];
    
    if (!contact) {
      const defaultContact = {
        title: 'Contact Us',
        description: 'Get in touch with us for any inquiries',
        images: [
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tea%20shop%20interior%20design&image_size=landscape_4_3',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20tea%20ceremony%20setup&image_size=landscape_4_3',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20pottery%20workshop&image_size=landscape_4_3'
        ],
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        address: '123 Zisha Street, Yixing, Jiangsu, China',
        email: 'info@zishapottery.com',
        phone: '+86 123 4567 8910',
        opening_hours: 'Monday - Friday: 9:00 AM - 6:00 PM\nSaturday: 10:00 AM - 4:00 PM\nSunday: Closed'
      };
      
      const insertResult = await query(
        'INSERT INTO contact (title, description, images, video_url, address, email, phone, opening_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          defaultContact.title,
          defaultContact.description,
          defaultContact.images,
          defaultContact.video_url,
          defaultContact.address,
          defaultContact.email,
          defaultContact.phone,
          defaultContact.opening_hours
        ]
      );

      const newContact = await query('SELECT * FROM contact WHERE id = ?', [insertResult.lastInsertRowid]);
      contact = newContact.rows[0];
    }
    
    logMonitor('CONTACT', 'SUCCESS', { action: 'GET_CONTACT', has_contact: !!contact });
    return NextResponse.json(contact);
  } catch (error: any) {
    logMonitor('CONTACT', 'ERROR', { action: 'GET_CONTACT', error: error?.message || String(error) });
    console.error('Error getting contact information:', error);
    return NextResponse.json({ error: 'Failed to get contact information' }, { status: 500 });
  }
}

// POST /api/contact - Update contact information
export async function POST(request: NextRequest) {
  try {
    logMonitor('CONTACT', 'REQUEST', { method: 'POST', action: 'UPDATE_CONTACT' });

    const data = await request.json();
    const { title, description, images, videoUrl, address, email, phone, openingHours } = data;
    
    const updateResult = await query(`
      INSERT INTO contact (title, description, images, video_url, address, email, phone, opening_hours)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO UPDATE
      SET
        title = ?,
        description = ?,
        images = ?,
        video_url = ?,
        address = ?,
        email = ?,
        phone = ?,
        opening_hours = ?
    `, [
      title,
      description,
      images,
      videoUrl,
      address,
      email,
      phone,
      openingHours,
      title,
      description,
      images,
      videoUrl,
      address,
      email,
      phone,
      openingHours
    ]);

    logMonitor('CONTACT', 'SUCCESS', { action: 'UPDATE_CONTACT' });
    return NextResponse.json({ success: true, data: updateResult });
  } catch (error: any) {
    logMonitor('CONTACT', 'ERROR', { action: 'UPDATE_CONTACT', error: error?.message || String(error) });
    console.error('Error updating contact information:', error);
    return NextResponse.json({ error: 'Failed to update contact information' }, { status: 500 });
  }
}
