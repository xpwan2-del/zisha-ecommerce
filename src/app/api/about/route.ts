import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

// GET /api/about - Get about information
export async function GET() {
  try {
    logMonitor('ABOUT', 'REQUEST', { method: 'GET', action: 'GET_ABOUT' });
    
    const result = await query('SELECT * FROM about LIMIT 1') as { rows: any[] };

    let about = result.rows[0];
    
    if (!about) {
      // Create default about if not exists
      const defaultAbout = {
        title: 'About Us',
        description: 'Learn about our zisha pottery craftsmanship',
        images: [
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20pottery%20craftsman%20working%20on%20teapot&image_size=landscape_4_3',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapots%20display%20in%20shop&image_size=landscape_4_3',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20tea%20ceremony&image_size=landscape_4_3'
        ],
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        content: 'Our zisha pottery is handcrafted by skilled artisans using traditional techniques that have been passed down for generations. Each piece is unique and carries the essence of Chinese culture and craftsmanship.'
      };
      
      const insertResult = await query(
        'INSERT INTO about (title, description, images, video_url, content) VALUES ($1, $2, $3, $4, $5)',
        [
          defaultAbout.title,
          defaultAbout.description,
          defaultAbout.images,
          defaultAbout.video_url,
          defaultAbout.content
        ]
      );

      about = { id: 1, ...defaultAbout };
    }
    
    logMonitor('ABOUT', 'SUCCESS', { action: 'GET_ABOUT', hasData: !!about });
    
    return NextResponse.json(about);
  } catch (error: any) {
    logMonitor('ABOUT', 'ERROR', { action: 'GET_ABOUT', error: error?.message || String(error) });
    console.error('Error getting about information:', error);
    return NextResponse.json({ error: 'Failed to get about information' }, { status: 500 });
  }
}

// POST /api/about - Update about information
export async function POST(request: NextRequest) {
  try {
    logMonitor('ABOUT', 'REQUEST', { method: 'POST', action: 'UPDATE_ABOUT' });
    
    const data = await request.json();
    const { title, description, images, videoUrl, content } = data;
    
    // Use UPSERT logic - update if exists, insert if not
    const result = await query(`
      INSERT INTO about (title, description, images, video_url, content)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO UPDATE
      SET
        title = $1,
        description = $2,
        images = $3,
        video_url = $4,
        content = $5
    `, [
      title,
      description,
      images,
      videoUrl,
      content
    ]);

    return NextResponse.json({ id: 1, title, description, images, video_url: videoUrl, content });
  } catch (error) {
    console.error('Error updating about information:', error);
    return NextResponse.json({ error: 'Failed to update about information' }, { status: 500 });
  }
}
