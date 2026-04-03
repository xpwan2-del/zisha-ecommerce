// 检查是否在 Vercel 环境中
const isVercel = process.env.VERCEL === '1';

let query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount: number }>;
let getDb: () => Promise<any>;

// 在 Vercel 环境中使用内存数据库模拟
if (isVercel) {
  // 内存数据库模拟
  const mockData = {
    teapot_types: [
      { id: 1, name: '西施壶', name_en: 'Xishi Teapot', description: '经典西施壶造型', base_price: 1200, min_capacity: 150, max_capacity: 300, images: '["/images/teapot1.jpg"]', status: 'active' },
      { id: 2, name: '石瓢壶', name_en: 'Shipiao Teapot', description: '传统石瓢壶设计', base_price: 1500, min_capacity: 200, max_capacity: 350, images: '["/images/teapot2.jpg"]', status: 'active' },
      { id: 3, name: '井栏壶', name_en: 'Jinglan Teapot', description: '井栏造型，古朴典雅', base_price: 1800, min_capacity: 250, max_capacity: 400, images: '["/images/teapot3.jpg"]', status: 'active' },
      { id: 4, name: '宫灯壶', name_en: 'Gongdeng Teapot', description: '宫灯造型，端庄大气', base_price: 2000, min_capacity: 300, max_capacity: 450, images: '["/images/teapot4.jpg"]', status: 'active' },
      { id: 5, name: '掇球壶', name_en: 'Duoqiu Teapot', description: '掇球造型，圆润饱满', base_price: 1600, min_capacity: 200, max_capacity: 350, images: '["/images/teapot5.jpg"]', status: 'active' }
    ],
    materials: [
      { id: 1, name: '红泥', description: '色泽红润，透气性好', price_modifier: 200, color: '#d2691e', status: 'active' },
      { id: 2, name: '紫泥', description: '色泽古朴，质感细腻', price_modifier: 250, color: '#6b4423', status: 'active' },
      { id: 3, name: '段泥', description: '色泽淡雅，透气性佳', price_modifier: 300, color: '#f5deb3', status: 'active' },
      { id: 4, name: '绿泥', description: '色泽翠绿，稀有珍贵', price_modifier: 400, color: '#556b2f', status: 'active' }
    ],
    about: [
      { id: 1, title: '关于我们', content: '我们是一家专业的紫砂壶定制公司，致力于为客户提供高品质的紫砂壶产品。', image: '/images/about.jpg' }
    ],
    contact: [
      { id: 1, email: 'contact@example.com', phone: '1234567890', address: '中国江苏省宜兴市' }
    ],
    categories: [
      { id: 1, name: '经典壶型', description: '传统经典紫砂壶造型' },
      { id: 2, name: '现代壶型', description: '现代设计的紫砂壶造型' },
      { id: 3, name: '定制壶型', description: '根据客户需求定制的紫砂壶造型' }
    ],
    products: [
      { id: 1, name: '经典西施壶', description: '传统西施壶造型，工艺精湛', price: 1200, images: '["/images/product1.jpg"]', category_id: 1, stock: 10, status: 'active' },
      { id: 2, name: '现代石瓢壶', description: '现代设计的石瓢壶，造型独特', price: 1500, images: '["/images/product2.jpg"]', category_id: 2, stock: 8, status: 'active' },
      { id: 3, name: '定制宫灯壶', description: '根据客户需求定制的宫灯壶', price: 2000, images: '["/images/product3.jpg"]', category_id: 3, stock: 5, status: 'active' }
    ]
  };

  query = async (text: string, params?: any[]) => {
    console.log('Mock query:', text, params);
    
    // 模拟查询逻辑
    if (text.includes('teapot_types')) {
      return { rows: mockData.teapot_types, rowCount: mockData.teapot_types.length };
    } else if (text.includes('materials')) {
      return { rows: mockData.materials, rowCount: mockData.materials.length };
    } else if (text.includes('about')) {
      return { rows: mockData.about, rowCount: mockData.about.length };
    } else if (text.includes('contact')) {
      return { rows: mockData.contact, rowCount: mockData.contact.length };
    } else if (text.includes('categories')) {
      return { rows: mockData.categories, rowCount: mockData.categories.length };
    } else if (text.includes('products')) {
      return { rows: mockData.products, rowCount: mockData.products.length };
    }
    
    return { rows: [], rowCount: 0 };
  };
  
  getDb = () => {
    return Promise.resolve({} as any);
  };
} else {
  // 本地环境使用 sqlite3
  const sqlite3 = require('sqlite3');
  const { open } = require('sqlite');

  let db: any = null;

  getDb = async () => {
    if (!db) {
      db = await open({
        filename: './zisha-ecommerce.db',
        driver: sqlite3.Database
      });
    }
    return db;
  };

  query = async (text: string, params?: any[]) => {
    const start = Date.now();
    const database = await getDb();
    const res = await database.all(text, params || []);
    const duration = Date.now() - start;
    console.log('executed query', {
      text,
      duration,
      rows: res.length
    });
    return { rows: res, rowCount: res.length };
  };
}

export { query, getDb };