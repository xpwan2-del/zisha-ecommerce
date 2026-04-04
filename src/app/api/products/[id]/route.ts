import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const mockProducts = [
  {
    id: 1,
    name: "Classic Zisha Teapot",
    name_en: "Classic Zisha Teapot",
    name_ar: "إبوة زيشا الكلاسيكية",
    price: 120,
    original_price: 150,
    stock: 50,
    category_id: "teapots",
    image: "https://placehold.co/400x400/e8d4c4/ffffff?text=Classic+Zisha+Teapot",
    images: [
      "https://placehold.co/400x400/e8d4c4/ffffff?text=Classic+Zisha+Teapot",
      "https://placehold.co/400x400/d4a574/ffffff?text=Side+View",
      "https://placehold.co/400x400/c9a686/ffffff?text=Top+View",
      "https://placehold.co/400x400/b89776/ffffff?text=With+Tea"
    ],
    description: "Handcrafted from authentic Yixing clay, this classic zisha teapot is perfect for brewing all types of tea. The natural porous nature of zisha clay helps to enhance the flavor of tea over time, making it a favorite among tea enthusiasts.",
    features: [
      "Authentic Yixing clay",
      "Handcrafted by skilled artisans",
      "150ml capacity",
      "Heat resistant",
      "Enhances tea flavor"
    ],
    specifications: {
      weight: "300g",
      size: "15cm x 10cm x 8cm",
      capacity: "150ml",
      material: "Zisha clay"
    },
    shipping: {
      free_shipping: true,
      min_order: 100
    },
    after_sale: {
      return_policy: "7-day return policy",
      refund_policy: "Full refund within 7 days",
      warranty: "1 year warranty"
    },
    is_limited: true,
    discount: 20
  },
  {
    id: 2,
    name: "Zisha Tea Cup Set",
    name_en: "Zisha Tea Cup Set",
    name_ar: "مجموعة أكواب الشاي من زيشا",
    price: 85,
    original_price: 100,
    stock: 30,
    category_id: "cups",
    image: "https://placehold.co/400x400/a8d5ba/ffffff?text=Zisha+Tea+Cup+Set",
    images: [
      "https://placehold.co/400x400/a8d5ba/ffffff?text=Zisha+Tea+Cup+Set",
      "https://placehold.co/400x400/7bc4c4/ffffff?text=Close+Up",
      "https://placehold.co/400x400/5dade2/ffffff?text=Stacked",
      "https://placehold.co/400x400/48c9b0/ffffff?text=With+Tea"
    ],
    description: "Beautiful set of 4 zisha tea cups, perfect for tea ceremonies. Each cup is handcrafted with attention to detail.",
    features: [
      "Set of 4 cups",
      "Handmade",
      "Elegant design",
      "Dishwasher safe"
    ],
    specifications: {
      weight: "200g",
      size: "8cm x 6cm x 5cm",
      capacity: "80ml",
      material: "Zisha clay"
    },
    shipping: {
      free_shipping: true,
      min_order: 100
    },
    after_sale: {
      return_policy: "7-day return policy",
      refund_policy: "Full refund within 7 days",
      warranty: "1 year warranty"
    },
    is_limited: false,
    discount: 0
  },
  {
    id: 3,
    name: "Premium Zisha Teapot",
    name_en: "Premium Zisha Teapot",
    name_ar: "إبوة زيشا المميزة",
    price: 200,
    original_price: 250,
    stock: 20,
    category_id: "teapots",
    image: "https://placehold.co/400x400/f4d03f/ffffff?text=Premium+Zisha+Teapot",
    images: [
      "https://placehold.co/400x400/f4d03f/ffffff?text=Premium+Zisha+Teapot",
      "https://placehold.co/400x400/e74c3c/ffffff?text=Side+View",
      "https://placehold.co/400x400/c0392b/ffffff?text=Top+View"
    ],
    description: "Premium quality zisha teapot with gold trim, perfect for special occasions. The gold accents add a touch of elegance while maintaining the traditional functionality.",
    features: [
      "Premium quality",
      "Gold trim",
      "200ml capacity",
      "Handcrafted"
    ],
    specifications: {
      weight: "350g",
      size: "16cm x 12cm x 10cm",
      capacity: "200ml",
      material: "Zisha clay with gold trim"
    },
    shipping: {
      free_shipping: true,
      min_order: 100
    },
    after_sale: {
      return_policy: "7-day return policy",
      refund_policy: "Full refund within 7 days",
      warranty: "1 year warranty"
    },
    is_limited: true,
    discount: 15
  },
  {
    id: 4,
    name: "Traditional Tea Set",
    name_en: "Traditional Tea Set",
    name_ar: "مجموعة الشاي التقليدية",
    price: 350,
    original_price: 400,
    stock: 15,
    category_id: "sets",
    image: "https://placehold.co/400x400/27ae60/ffffff?text=Traditional+Tea+Set",
    images: [
      "https://placehold.co/400x400/27ae60/ffffff?text=Traditional+Tea+Set",
      "https://placehold.co/400x400/2ecc71/ffffff?text=Side+View"
    ],
    description: "Complete traditional tea set with teapot and 6 cups. Perfect for hosting tea ceremonies or enjoying tea with family and friends.",
    features: [
      "Complete set",
      "Teapot + 6 cups",
      "Traditional design",
      "Gift packaging"
    ],
    specifications: {
      weight: "800g",
      size: "25cm x 20cm x 15cm",
      capacity: "Teapot: 300ml, Cups: 80ml",
      material: "Zisha clay"
    },
    shipping: {
      free_shipping: true,
      min_order: 100
    },
    after_sale: {
      return_policy: "7-day return policy",
      refund_policy: "Full refund within 7 days",
      warranty: "1 year warranty"
    },
    is_limited: false,
    discount: 10
  }
];

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const result = await query(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    const product = result.rows[0];

    // 确保数值类型正确并计算库存状态
    product.price = parseFloat(String(product.price)) || 0;
    product.original_price = parseFloat(String(product.original_price)) || 0;
    product.stock = parseInt(String(product.stock)) || 0;
    (product as any).inStock = product.stock > 0;

    if (product.images && typeof product.images === 'string') {
      try {
        product.images = JSON.parse(String(product.images));
      } catch (e) {
        product.images = [] as any;
      }
    }
    
    if (product.features && typeof product.features === 'string') {
      try {
        product.features = JSON.parse(product.features);
      } catch (e) {
        product.features = [] as any;
      }
    }
    
    if (product.specifications && typeof product.specifications === 'string') {
      try {
        product.specifications = JSON.parse(product.specifications);
      } catch (e) {
        product.specifications = {} as any;
      }
    }
    
    if (product.shipping && typeof product.shipping === 'string') {
      try {
        product.shipping = JSON.parse(product.shipping);
      } catch (e) {
        product.shipping = {} as any;
      }
    }
    
    if (product.after_sale && typeof product.after_sale === 'string') {
      try {
        product.after_sale = JSON.parse(product.after_sale);
      } catch (e) {
        product.after_sale = {} as any;
      }
    }
    
    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const { name, name_en, name_ar, price, original_price, stock, category_id, image, images, video, description, features, specifications, shipping, after_sale, is_limited, discount } = body;
    
    const result = await query(
      `UPDATE products SET
       name = ?,
       name_en = ?,
       name_ar = ?,
       price = ?,
       original_price = ?,
       stock = ?,
       category_id = ?,
       image = ?,
       images = ?,
       video = ?,
       description = ?,
       features = ?,
       specifications = ?,
       shipping = ?,
       after_sale = ?,
       is_limited = ?,
       discount = ?
       WHERE id = ?`,
      [name, name_en, name_ar, price, original_price || 0, stock, category_id, image, JSON.stringify(images || []), video || '', description, JSON.stringify(features || []), JSON.stringify(specifications || {}), JSON.stringify(shipping || {}), JSON.stringify(after_sale || {}), is_limited || false, discount || 0, id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const result = await query(
      'DELETE FROM products WHERE id = ?',
      [id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}