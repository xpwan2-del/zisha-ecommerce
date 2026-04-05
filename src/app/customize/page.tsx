"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/lib/contexts/CartContext';

export default function CustomizePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { addToCart } = useCart();
  
  // 状态管理
  const [step, setStep] = useState(1);
  const [teapotTypes, setTeapotTypes] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 定制数据
  const [customData, setCustomData] = useState({
    teapotType: null as any,
    material: null as any,
    capacity: 200,
    engraving: {
      enabled: false,
      text: '',
      font: '书法体',
      position: '壶身正面'
    },
    pattern: {
      enabled: false,
      type: 'template',
      template: '传统纹样',
      image: '',
      position: '壶身正面'
    }
  });
  
  // 图案示例数据
  const [patternTemplates, setPatternTemplates] = useState([
    {
      id: 1,
      name: '传统纹样',
      name_en: 'Traditional Pattern',
      name_ar: 'نمط تقليدي',
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20traditional%20pattern%20for%20zisha%20teapot%20elegant%20design&image_size=square'
    },
    {
      id: 2,
      name: '花卉',
      name_en: 'Flowers',
      name_ar: 'زهور',
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20flower%20pattern%20for%20zisha%20teapot%20elegant%20design&image_size=square'
    },
    {
      id: 3,
      name: '诗词',
      name_en: 'Poetry',
      name_ar: 'شعر',
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20poetry%20calligraphy%20for%20zisha%20teapot%20elegant%20design&image_size=square'
    },
    {
      id: 4,
      name: '山水',
      name_en: 'Landscape',
      name_ar: 'منظر طبيعي',
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20landscape%20painting%20for%20zisha%20teapot%20elegant%20design&image_size=square'
    },
    {
      id: 5,
      name: '动物',
      name_en: 'Animals',
      name_ar: 'حيوانات',
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20animal%20pattern%20for%20zisha%20teapot%20elegant%20design&image_size=square'
    },
    {
      id: 6,
      name: '几何纹样',
      name_en: 'Geometric',
      name_ar: 'هندسي',
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=geometric%20pattern%20for%20zisha%20teapot%20modern%20design&image_size=square'
    }
  ]);
  
  // 默认壶型数据
  const defaultTeapotTypes = [
    {
      id: 1,
      name: '西施壶',
      name_en: 'Xishi Teapot',
      name_ar: 'أبوالغزالي',
      images: JSON.stringify({
        '壶身正面': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20xishi%20style%20single%20teapot%20on%20white%20background%20clay%20pottery&image_size=square',
        '壶身背面': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20xishi%20style%20back%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶底': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20xishi%20style%20bottom%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶盖': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20xishi%20style%20lid%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶把': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20xishi%20style%20handle%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶嘴': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20xishi%20style%20spout%20view%20single%20teapot%20on%20white%20background&image_size=square'
      }),
      min_capacity: 150,
      max_capacity: 300,
      base_price: 200,
      description: '经典西施壶造型，圆润饱满，线条流畅'
    },
    {
      id: 2,
      name: '石瓢壶',
      name_en: 'Shipiao Teapot',
      name_ar: 'قمر الصخرة',
      images: JSON.stringify({
        '壶身正面': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20shipiao%20style%20single%20teapot%20on%20white%20background%20clay%20pottery&image_size=square',
        '壶身背面': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20shipiao%20style%20back%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶底': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20shipiao%20style%20bottom%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶盖': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20shipiao%20style%20lid%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶把': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20shipiao%20style%20handle%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶嘴': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20shipiao%20style%20spout%20view%20single%20teapot%20on%20white%20background&image_size=square'
      }),
      min_capacity: 200,
      max_capacity: 350,
      base_price: 250,
      description: '石瓢壶造型，稳重端庄，实用性强'
    },
    {
      id: 3,
      name: '掇球壶',
      name_en: 'Duoqiu Teapot',
      name_ar: 'كرة掇',
      images: JSON.stringify({
        '壶身正面': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20duoqiu%20style%20single%20teapot%20on%20white%20background%20clay%20pottery&image_size=square',
        '壶身背面': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20duoqiu%20style%20back%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶底': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20duoqiu%20style%20bottom%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶盖': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20duoqiu%20style%20lid%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶把': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20duoqiu%20style%20handle%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶嘴': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20duoqiu%20style%20spout%20view%20single%20teapot%20on%20white%20background&image_size=square'
      }),
      min_capacity: 180,
      max_capacity: 320,
      base_price: 220,
      description: '掇球壶造型，浑圆饱满，手感舒适'
    },
    {
      id: 4,
      name: '仿古壶',
      name_en: 'Fungu Teapot',
      name_ar: 'حاليوم',
      images: JSON.stringify({
        '壶身正面': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20fungu%20style%20single%20teapot%20on%20white%20background%20clay%20pottery&image_size=square',
        '壶身背面': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20fungu%20style%20back%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶底': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20fungu%20style%20bottom%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶盖': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20fungu%20style%20lid%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶把': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20fungu%20style%20handle%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶嘴': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20fungu%20style%20spout%20view%20single%20teapot%20on%20white%20background&image_size=square'
      }),
      min_capacity: 220,
      max_capacity: 380,
      base_price: 280,
      description: '仿古壶造型，古朴典雅，韵味十足'
    },
    {
      id: 5,
      name: '井栏壶',
      name_en: 'Jinglan Teapot',
      name_ar: 'جنجلان',
      images: JSON.stringify({
        '壶身正面': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20jinglan%20style%20single%20teapot%20on%20white%20background%20clay%20pottery&image_size=square',
        '壶身背面': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20jinglan%20style%20back%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶底': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20jinglan%20style%20bottom%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶盖': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20jinglan%20style%20lid%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶把': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20jinglan%20style%20handle%20view%20single%20teapot%20on%20white%20background&image_size=square',
        '壶嘴': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20jinglan%20style%20spout%20view%20single%20teapot%20on%20white%20background&image_size=square'
      }),
      min_capacity: 200,
      max_capacity: 350,
      base_price: 260,
      description: '井栏壶造型，方正稳重，传统经典'
    }
  ];

  // 默认泥料数据
  const defaultMaterials = [
    {
      id: 1,
      name: '红泥',
      name_en: 'Red Clay',
      name_ar: 'طين أحمر',
      color: '#D74B4B',
      description: '色泽红润，透气性好',
      price_modifier: 0
    },
    {
      id: 2,
      name: '紫泥',
      name_en: 'Purple Clay',
      name_ar: 'طين أرجواني',
      color: '#7C2D12',
      description: '经典紫泥，口感醇厚',
      price_modifier: 0
    },
    {
      id: 3,
      name: '段泥',
      name_en: 'Duan Clay',
      name_ar: 'طين دو�ן',
      color: '#E6B422',
      description: '色泽金黄，质感细腻',
      price_modifier: 50
    },
    {
      id: 4,
      name: '绿泥',
      name_en: 'Green Clay',
      name_ar: 'طين أخضر',
      color: '#4CAF50',
      description: '稀有绿泥，色泽独特',
      price_modifier: 100
    }
  ];

  // 渲染预览效果
  const renderPreview = () => {
    console.log('=== Starting renderPreview ===');
    const canvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
    if (!canvas) {
      console.log('Canvas not available');
      return;
    }
    if (!customData.teapotType) {
      console.log('Teapot type not available');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('Canvas context not available');
      return;
    }
    
    // 清空画布并绘制加载状态
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FEE7E7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#7C2D12';
    ctx.font = '16px Noto Serif TC, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('加载中...', canvas.width / 2, canvas.height / 2);
    
    // 确定要使用的图片位置
    let position = '壶身正面';
    if (customData.engraving.enabled) {
      position = customData.engraving.position;
    } else if (customData.pattern.enabled) {
      position = customData.pattern.position;
    }
    console.log('Selected position:', position);
    
    // 获取对应位置的图片URL
    let imageUrl = '';
    try {
      if (customData.teapotType.images) {
        const images = JSON.parse(customData.teapotType.images);
        if (typeof images === 'object' && images[position]) {
          imageUrl = images[position];
          console.log('Found image for position:', imageUrl);
        } else if (Array.isArray(images) && images.length > 0) {
          imageUrl = images[0];
          console.log('Using first image from array:', imageUrl);
        }
      }
    } catch (error) {
      console.error('Error parsing images:', error);
    }
    
    // 如果没有找到图片，使用默认图片
    if (!imageUrl) {
      imageUrl = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20single%20on%20white%20background&image_size=square';
      console.log('Using default image:', imageUrl);
    }
    
    console.log('Using image:', imageUrl);
    
    // 加载基础壶型图片
    const img = new Image();
    img.onload = () => {
      console.log('Image loaded successfully');
      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // 绘制基础图片
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // 绘制刻字
      if (customData.engraving.enabled && customData.engraving.text) {
        console.log('Drawing engraving:', customData.engraving.text);
        drawEngraving(ctx, canvas.width, canvas.height);
      }
      
      // 绘制图案
      if (customData.pattern.enabled) {
        console.log('Drawing pattern:', customData.pattern.template || 'custom');
        drawPattern(ctx, canvas.width, canvas.height);
      }
      
      console.log('Preview rendered successfully on original image');
    };
    img.onerror = () => {
      console.error('Error loading image:', imageUrl);
      // 尝试使用备用图片
      const fallbackImageUrl = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20single%20on%20white%20background&image_size=square';
      console.log('Using fallback image:', fallbackImageUrl);
      
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        console.log('Fallback image loaded successfully');
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // 绘制基础图片
        ctx.drawImage(fallbackImg, 0, 0, canvas.width, canvas.height);
        
        // 绘制刻字
        if (customData.engraving.enabled && customData.engraving.text) {
          drawEngraving(ctx, canvas.width, canvas.height);
        }
        
        // 绘制图案
        if (customData.pattern.enabled) {
          drawPattern(ctx, canvas.width, canvas.height);
        }
        
        console.log('Preview rendered successfully on fallback image');
      };
      fallbackImg.onerror = () => {
        console.error('Fallback image also failed');
        // 绘制错误信息
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FEE7E7';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#7C2D12';
        ctx.font = '16px Noto Serif TC, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('图片加载失败', canvas.width / 2, canvas.height / 2);
        console.log('Preview failed due to image loading error');
      };
      fallbackImg.src = fallbackImageUrl;
    };
    
    console.log('Loading image:', imageUrl);
    img.src = imageUrl;
  };
  
  // 绘制默认茶壶形状和信息
  const drawDefaultTeapot = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制茶壶轮廓
    ctx.fillStyle = customData.material?.color || '#7C2D12';
    
    // 绘制壶身
    ctx.beginPath();
    ctx.ellipse(width / 2, height * 0.6, width * 0.35, height * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制壶盖
    ctx.beginPath();
    ctx.ellipse(width / 2, height * 0.35, width * 0.15, height * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制壶嘴
    ctx.beginPath();
    ctx.moveTo(width * 0.7, height * 0.6);
    ctx.lineTo(width * 0.85, height * 0.55);
    ctx.lineTo(width * 0.85, height * 0.65);
    ctx.closePath();
    ctx.fill();
    
    // 绘制壶把
    ctx.beginPath();
    ctx.moveTo(width * 0.3, height * 0.6);
    ctx.quadraticCurveTo(width * 0.15, height * 0.5, width * 0.2, height * 0.6);
    ctx.quadraticCurveTo(width * 0.15, height * 0.7, width * 0.3, height * 0.6);
    ctx.fill();
    
    // 绘制茶壶信息
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px Noto Serif TC, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(customData.teapotType?.name || '紫砂壶', width / 2, height * 0.85);
    
    // 绘制刻字
    if (customData.engraving.enabled && customData.engraving.text) {
      drawEngraving(ctx, width, height);
    }
    
    // 绘制图案
    if (customData.pattern.enabled) {
      drawPattern(ctx, width, height);
    }
  };
  
  // 绘制刻字
  const drawEngraving = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!customData.engraving.text) return;
    
    // 根据位置确定刻字位置
    let x = width / 2;
    let y = height / 2;
    
    switch (customData.engraving.position) {
      case '壶身正面':
        y = height * 0.6;
        break;
      case '壶身背面':
        y = height * 0.6;
        break;
      case '壶底':
        y = height * 0.8;
        break;
      case '壶盖':
        y = height * 0.3;
        break;
      case '壶把':
        x = width * 0.8;
        y = height * 0.5;
        break;
      case '壶嘴':
        x = width * 0.2;
        y = height * 0.5;
        break;
    }
    
    // 设置文字样式
    ctx.font = '16px Noto Serif TC, serif';
    ctx.fillStyle = '#7C2D12';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 绘制文字
    ctx.fillText(customData.engraving.text, x, y);
  };
  
  // 绘制图案
  const drawPattern = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // 根据位置确定图案位置
    let x = width / 2;
    let y = height / 2;
    let patternSize = 60;
    
    switch (customData.pattern.position) {
      case '壶身正面':
        y = height * 0.6;
        break;
      case '壶身背面':
        y = height * 0.6;
        break;
      case '壶底':
        y = height * 0.8;
        patternSize = 40;
        break;
      case '壶盖':
        y = height * 0.3;
        patternSize = 30;
        break;
      case '壶把':
        x = width * 0.8;
        y = height * 0.5;
        patternSize = 20;
        break;
      case '壶嘴':
        x = width * 0.2;
        y = height * 0.5;
        patternSize = 20;
        break;
    }
    
    if (customData.pattern.type === 'template' && customData.pattern.template) {
      // 查找对应的图案模板
      const template = patternTemplates.find(t => t.name === customData.pattern.template);
      if (template) {
        const patternImg = new Image();
        patternImg.onload = () => {
          // 绘制图案
          ctx.drawImage(patternImg, x - patternSize/2, y - patternSize/2, patternSize, patternSize);
        };
        patternImg.src = template.image;
      }
    } else {
      // 绘制默认图案
      ctx.fillStyle = '#CA8A04';
      ctx.beginPath();
      ctx.arc(x, y, patternSize/2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // 加载数据
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [teapotTypesRes, materialsRes] = await Promise.all([
          fetch('/api/teapot-types'),
          fetch('/api/materials')
        ]);
        
        const teapotTypesData = await teapotTypesRes.json();
        const materialsData = await materialsRes.json();
        
        // 如果 API 返回数据，则使用 API 数据，否则使用默认数据
        setTeapotTypes(teapotTypesData && teapotTypesData.length > 0 ? teapotTypesData : defaultTeapotTypes);
        setMaterials(materialsData && materialsData.length > 0 ? materialsData : defaultMaterials);
      } catch (error) {
        console.error('Error fetching data:', error);
        // API 请求失败时使用默认数据
        setTeapotTypes(defaultTeapotTypes);
        setMaterials(defaultMaterials);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);
  
  // 使用ref来跟踪步骤变化
  const stepRef = useRef(step);
  
  // 当组件渲染时检查step是否变化
  useEffect(() => {
    if (stepRef.current !== step) {
      stepRef.current = step;
      console.log('Step changed to:', step);
      if (step === 6) {
        console.log('Step 6 reached, rendering preview');
        // 直接调用renderPreview
        renderPreview();
      }
    }
  });
  
  // 当customData变化时重新渲染预览
  useEffect(() => {
    if (step === 6) {
      console.log('Custom data changed, rendering preview');
      renderPreview();
    }
  }, [customData, step]);
  
  // 计算价格
  const calculatePrice = () => {
    let basePrice = customData.teapotType?.base_price || 0;
    let materialPrice = customData.material?.price_modifier || 0;
    let engravingPrice = customData.engraving.enabled ? 50 : 0;
    let patternPrice = customData.pattern.enabled ? 30 : 0;
    
    return basePrice + materialPrice + engravingPrice + patternPrice;
  };
  
  // 下一步
  const handleNext = () => {
    if (step < 7) {
      setStep(step + 1);
    }
  };
  
  // 上一步
  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  // 完成定制
  const handleComplete = () => {
    const totalPrice = calculatePrice();
    
    addToCart({
      id: parseInt(`custom-${Date.now()}`.replace('custom-', '')),
      name: `${customData.teapotType?.name} 定制紫砂壶`,
      price: totalPrice,
      image: customData.teapotType?.images ? JSON.parse(customData.teapotType.images)[0] : ''
    });
    
    router.push('/cart');
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amazon-orange"></div>
      </div>
    );
  }
  
  return (
    <div className="py-12 px-4 bg-[#FEF2F2] min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 sm:mb-12 text-center text-[#450A0A] font-['Noto_Serif_TC']">{t('customize.title')}</h1>
        
        {/* 进度条 */}
        <div className="mb-8 sm:mb-12 bg-white rounded-xl p-4 sm:p-6 shadow-lg border border-[#7C2D12]/20">
          <div className="flex justify-between items-center mb-4 sm:mb-6 overflow-x-auto pb-2">
            {[...Array(7)].map((_, index) => (
              <div key={index} className="flex flex-col items-center min-w-[80px]">
                <div className={`w-10 sm:w-12 h-10 sm:h-12 rounded-full flex items-center justify-center font-bold mb-2 sm:mb-3 transition-all duration-300 ease-in-out ${step > index + 1 ? 'bg-[#CA8A04] text-white shadow-lg shadow-[#CA8A04]/20' : step === index + 1 ? 'bg-[#CA8A04] text-white shadow-lg shadow-[#CA8A04]/20 scale-110' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {index + 1}
                </div>
                <span className={`text-xs font-medium transition-all duration-300 ${step > index + 1 ? 'text-[#CA8A04]' : step === index + 1 ? 'text-[#CA8A04] font-semibold' : 'text-gray-500'}`}>
                  {t(`customize.step${index + 1}`)}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 sm:h-3 overflow-hidden">
            <div className="bg-[#CA8A04] h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${((step - 1) / 6) * 100}%` }}></div>
          </div>
        </div>
        
        {/* 步骤内容 */}
        <div className="bg-white rounded-xl shadow-xl p-6 sm:p-8 mb-8 border border-[#7C2D12]/20">
          {/* 步骤1：选择壶型 */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-[#450A0A] font-['Noto_Serif_TC']">{t('customize.step1')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {teapotTypes.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => setCustomData({ ...customData, teapotType: type })}
                    className={`cursor-pointer border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl ${customData.teapotType?.id === type.id ? 'border-[#CA8A04] bg-[#CA8A04]/5 shadow-md shadow-[#CA8A04]/10' : 'border-[#7C2D12]/20 hover:border-[#CA8A04] hover:shadow-lg'}`}
                  >
                    <div className="aspect-square overflow-hidden relative group">
                      <img 
                        src={(() => {
                          try {
                            const images = JSON.parse(type.images);
                            if (typeof images === 'object') {
                              return images['壶身正面'] || '/teapot_collection.png';
                            } else if (Array.isArray(images)) {
                              return images[0] || '/teapot_collection.png';
                            }
                          } catch (error) {
                            console.error('Error parsing images:', error);
                          }
                          return '/teapot_collection.png';
                        })()} 
                        alt={type.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {customData.teapotType?.id === type.id && (
                        <div className="absolute inset-0 bg-[#CA8A04]/20 flex items-center justify-center">
                          <div className="bg-white text-[#CA8A04] px-3 py-1 rounded-full text-sm font-medium">
                            已选择
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold mb-1 text-[#450A0A]">{type.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{type.name_en}</p>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500">{type.min_capacity}-{type.max_capacity}ml</p>
                        <p className="text-sm font-bold text-[#CA8A04]">${Number(type.base_price).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 步骤2：选择泥料 */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-[#450A0A] font-['Noto_Serif_TC']">{t('customize.step2')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {materials.map((material) => (
                  <div
                    key={material.id}
                    onClick={() => setCustomData({ ...customData, material })}
                    className={`cursor-pointer border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl ${customData.material?.id === material.id ? 'border-[#CA8A04] bg-[#CA8A04]/5 shadow-md shadow-[#CA8A04]/10' : 'border-[#7C2D12]/20 hover:border-[#CA8A04] hover:shadow-lg'}`}
                  >
                    <div className="aspect-square relative group">
                      <div 
                        className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundColor: material.color }}
                      ></div>
                      {customData.material?.id === material.id && (
                        <div className="absolute inset-0 bg-[#CA8A04]/20 flex items-center justify-center">
                          <div className="bg-white text-[#CA8A04] px-3 py-1 rounded-full text-sm font-medium">
                            已选择
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold mb-1 text-[#450A0A]">{material.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{material.description}</p>
                      {material.price_modifier > 0 && (
                        <p className="text-sm font-bold text-[#CA8A04]">+${Number(material.price_modifier).toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 步骤3：选择容量 */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-[#450A0A] font-['Noto_Serif_TC']">{t('customize.step3')}</h2>
              <div className="mb-10">
                <div className="mb-6">
                  <input
                    type="range"
                    min={customData.teapotType?.min_capacity || 100}
                    max={customData.teapotType?.max_capacity || 500}
                    value={customData.capacity}
                    onChange={(e) => setCustomData({ ...customData, capacity: parseInt(e.target.value) })}
                    className="w-full h-3 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                    style={{accentColor: '#CA8A04'}}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{customData.teapotType?.min_capacity || 100}ml</span>
                  <div className="text-center">
                    <span className="text-3xl font-bold text-[#CA8A04]">{customData.capacity}</span>
                    <span className="text-lg text-gray-600 ml-1">ml</span>
                  </div>
                  <span className="text-sm text-gray-500">{customData.teapotType?.max_capacity || 500}ml</span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-[#CA8A04]/5 to-[#CA8A04]/10 p-6 rounded-xl border border-[#CA8A04]/20">
                <p className="text-sm text-gray-600">
                  {customData.capacity < 150 ? t('customize.capacity_small') : 
                   customData.capacity < 250 ? t('customize.capacity_medium') : 
                   t('customize.capacity_large')}
                </p>
              </div>
            </div>
          )}
          
          {/* 步骤4：刻字服务 */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-[#450A0A] font-['Noto_Serif_TC']">{t('customize.step4')}</h2>
              <div className="flex items-center gap-4 mb-8">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customData.engraving.enabled}
                    onChange={(e) => setCustomData({ 
                      ...customData, 
                      engraving: { ...customData.engraving, enabled: e.target.checked } 
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#CA8A04]"></div>
                  <span className="ml-3 text-sm font-medium text-[#450A0A]">{t('customize.engraving_enable')}</span>
                </label>
                <span className="text-sm font-bold text-[#CA8A04]">+50 AED</span>
              </div>
              
              {customData.engraving.enabled && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3 text-[#450A0A]">{t('customize.engraving_text')}</label>
                    <input
                      type="text"
                      value={customData.engraving.text}
                      onChange={(e) => setCustomData({ 
                        ...customData, 
                        engraving: { ...customData.engraving, text: e.target.value } 
                      })}
                      maxLength={20}
                      className="w-full px-5 py-3 border border-[#7C2D12]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#CA8A04] focus:border-transparent transition-all duration-200"
                      placeholder={t('customize.engraving_placeholder')}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500">{customData.engraving.text.length}/20</p>
                      <p className="text-xs text-gray-500">建议字数：2-8字</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-3 text-[#450A0A]">{t('customize.engraving_font')}</label>
                    <div className="flex flex-wrap gap-3">
                      {['书法体', '楷体', '篆体', '英文无衬线', '英文字体'].map((font) => (
                        <button
                          key={font}
                          onClick={() => setCustomData({ 
                            ...customData, 
                            engraving: { ...customData.engraving, font } 
                          })}
                          className={`px-5 py-2.5 rounded-lg border transition-all duration-200 ${customData.engraving.font === font ? 'border-[#CA8A04] bg-[#CA8A04]/10 shadow-sm' : 'border-[#7C2D12]/20 hover:border-[#CA8A04]'}`}
                        >
                          {font}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-3 text-[#450A0A]">{t('customize.engraving_position')}</label>
                    <div className="flex flex-wrap gap-3">
                      {['壶身正面', '壶身背面', '壶底', '壶盖', '壶把', '壶嘴'].map((position) => (
                        <button
                          key={position}
                          onClick={() => setCustomData({ 
                            ...customData, 
                            engraving: { ...customData.engraving, position } 
                          })}
                          className={`px-5 py-2.5 rounded-lg border transition-all duration-200 ${customData.engraving.position === position ? 'border-[#CA8A04] bg-[#CA8A04]/10 shadow-sm' : 'border-[#7C2D12]/20 hover:border-[#CA8A04]'}`}
                        >
                          {position}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 步骤5：图案定制 */}
          {step === 5 && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-[#450A0A] font-['Noto_Serif_TC']">{t('customize.step5')}</h2>
              <div className="flex items-center gap-4 mb-8">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customData.pattern.enabled}
                    onChange={(e) => setCustomData({ 
                      ...customData, 
                      pattern: { ...customData.pattern, enabled: e.target.checked } 
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#CA8A04]"></div>
                  <span className="ml-3 text-sm font-medium text-[#450A0A]">{t('customize.pattern_enable')}</span>
                </label>
                <span className="text-sm font-bold text-[#CA8A04]">+30 AED</span>
              </div>
              
              {customData.pattern.enabled && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3 text-[#450A0A]">{t('customize.pattern_method')}</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setCustomData({ 
                          ...customData, 
                          pattern: { ...customData.pattern, type: 'template' } 
                        })}
                        className={`flex-1 py-3 rounded-lg transition-all duration-200 ${customData.pattern.type === 'template' ? 'bg-[#CA8A04] text-white shadow-md' : 'border border-[#7C2D12]/20 hover:border-[#CA8A04]'}`}
                      >
                        {t('customize.pattern_template')}
                      </button>
                      <button
                        onClick={() => setCustomData({ 
                          ...customData, 
                          pattern: { ...customData.pattern, type: 'upload' } 
                        })}
                        className={`flex-1 py-3 rounded-lg transition-all duration-200 ${customData.pattern.type === 'upload' ? 'bg-[#CA8A04] text-white shadow-md' : 'border border-[#7C2D12]/20 hover:border-[#CA8A04]'}`}
                      >
                        {t('customize.pattern_upload')}
                      </button>
                    </div>
                  </div>
                  
                  {customData.pattern.type === 'template' && (
                    <div>
                      <label className="block text-sm font-medium mb-3 text-[#450A0A]">{t('customize.pattern_template')}</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {patternTemplates.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => setCustomData({ 
                              ...customData, 
                              pattern: { ...customData.pattern, template: template.name } 
                            })}
                            className={`border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl ${customData.pattern.template === template.name ? 'border-[#CA8A04] bg-[#CA8A04]/5 shadow-md shadow-[#CA8A04]/10' : 'border-[#7C2D12]/20 hover:border-[#CA8A04] hover:shadow-lg'}`}
                          >
                            <div className="aspect-square overflow-hidden">
                              <img 
                                src={template.image} 
                                alt={template.name} 
                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                              />
                            </div>
                            <div className="p-3">
                              <h3 className="font-semibold text-sm text-[#450A0A]">{template.name}</h3>
                              <p className="text-xs text-gray-600">{template.name_en}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {customData.pattern.type === 'upload' && (
                    <div>
                      <label className="block text-sm font-medium mb-3 text-[#450A0A]">{t('customize.pattern_upload')}</label>
                      <div className="border-2 border-dashed border-[#7C2D12]/30 rounded-xl p-8 text-center hover:border-[#CA8A04] transition-colors duration-200">
                        <input
                          type="file"
                          accept="image/*"
                          className="w-full px-5 py-3 border border-[#7C2D12]/20 rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-3">{t('customize.pattern_upload_note')}</p>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-3 text-[#450A0A]">{t('customize.pattern_position')}</label>
                    <div className="flex flex-wrap gap-3">
                      {['壶身正面', '壶身背面', '壶底', '壶盖', '壶把', '壶嘴'].map((position) => (
                        <button
                          key={position}
                          onClick={() => setCustomData({ 
                            ...customData, 
                            pattern: { ...customData.pattern, position } 
                          })}
                          className={`px-5 py-2.5 rounded-lg border transition-all duration-200 ${customData.pattern.position === position ? 'border-[#CA8A04] bg-[#CA8A04]/10 shadow-sm' : 'border-[#7C2D12]/20 hover:border-[#CA8A04]'}`}
                        >
                          {position}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 步骤6：预览效果 */}
          {step === 6 && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-[#450A0A] font-['Noto_Serif_TC']">{t('customize.step6')}</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-[#FEF2F2] to-[#FEE7E7] rounded-xl p-8 flex items-center justify-center shadow-sm">
                  <div className="text-center">
                    <div className="mb-6">
                      <canvas 
                        id="previewCanvas" 
                        width={288} 
                        height={288} 
                        className="w-72 h-72 mx-auto transition-all duration-500 hover:scale-105"
                      ></canvas>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm inline-block">
                      <h4 className="font-semibold text-[#450A0A] mb-2">{customData.teapotType?.name}</h4>
                      <p className="text-sm text-gray-600">{customData.material?.name} | {customData.capacity}ml</p>
                      {customData.engraving.enabled && (
                        <p className="text-sm text-[#CA8A04] mt-1">刻字: {customData.engraving.text} ({customData.engraving.position})</p>
                      )}
                      {customData.pattern.enabled && (
                        <p className="text-sm text-[#CA8A04] mt-1">图案: {customData.pattern.type === 'template' ? customData.pattern.template : '自定义图案'} ({customData.pattern.position})</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-5">
                  <h3 className="text-xl font-semibold text-[#450A0A]">{t('customize.customization_details')}</h3>
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-[#7C2D12]/20">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-[#7C2D12]/10">
                        <span className="text-gray-600">{t('customize.teapot_type')}:</span>
                        <span className="font-medium text-[#450A0A]">{customData.teapotType?.name}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[#7C2D12]/10">
                        <span className="text-gray-600">{t('customize.material')}:</span>
                        <span className="font-medium text-[#450A0A]">{customData.material?.name}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[#7C2D12]/10">
                        <span className="text-gray-600">{t('customize.capacity')}:</span>
                        <span className="font-medium text-[#450A0A]">{customData.capacity}ml</span>
                      </div>
                      {customData.engraving.enabled && (
                        <div className="flex justify-between items-center py-2 border-b border-[#7C2D12]/10">
                          <span className="text-gray-600">{t('customize.engraving')}:</span>
                          <span className="font-medium text-[#450A0A]">{customData.engraving.text}</span>
                        </div>
                      )}
                      {customData.pattern.enabled && (
                        <div className="flex justify-between items-center py-2 border-b border-[#7C2D12]/10">
                          <span className="text-gray-600">{t('customize.pattern')}:</span>
                          <span className="font-medium text-[#450A0A]">{customData.pattern.type === 'template' ? customData.pattern.template : t('customize.uploaded_image')}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold pt-4 mt-2">
                        <span className="text-[#450A0A]">{t('customize.total_price')}:</span>
                        <span className="text-[#CA8A04] text-2xl">{calculatePrice().toFixed(2)} AED</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 步骤7：下单 */}
          {step === 7 && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-[#450A0A] font-['Noto_Serif_TC']">{t('customize.step7')}</h2>
              <div className="space-y-8">
                <div className="bg-gradient-to-br from-[#CA8A04]/5 to-[#CA8A04]/10 p-6 rounded-xl border border-[#CA8A04]/20 shadow-sm">
                  <h3 className="text-xl font-semibold mb-6 text-[#450A0A]">{t('customize.order_summary')}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-[#CA8A04]/10">
                      <span className="text-gray-600">{t('customize.teapot_type')}:</span>
                      <span className="font-medium text-[#450A0A]">{customData.teapotType?.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#CA8A04]/10">
                      <span className="text-gray-600">{t('customize.material')}:</span>
                      <span className="font-medium text-[#450A0A]">{customData.material?.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#CA8A04]/10">
                      <span className="text-gray-600">{t('customize.capacity')}:</span>
                      <span className="font-medium text-[#450A0A]">{customData.capacity}ml</span>
                    </div>
                    {customData.engraving.enabled && (
                      <div className="flex justify-between items-center py-2 border-b border-[#CA8A04]/10">
                        <span className="text-gray-600">{t('customize.engraving')}:</span>
                        <span className="font-medium text-[#CA8A04]">+50 AED</span>
                      </div>
                    )}
                    {customData.pattern.enabled && (
                      <div className="flex justify-between items-center py-2 border-b border-[#CA8A04]/10">
                        <span className="text-gray-600">{t('customize.pattern')}:</span>
                        <span className="font-medium text-[#CA8A04]">+30 AED</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold pt-4 mt-2">
                      <span className="text-[#450A0A]">{t('customize.total_price')}:</span>
                      <span className="text-[#CA8A04] text-2xl">{calculatePrice().toFixed(2)} AED</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-[#450A0A]">{t('customize.notes')}</h3>
                  <textarea
                    className="w-full px-5 py-3 border border-[#7C2D12]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#CA8A04] focus:border-transparent transition-all duration-200"
                    rows={4}
                    placeholder={t('customize.notes_placeholder')}
                  ></textarea>
                </div>
              </div>
            </div>
          )}
          
          {/* 测试按钮 */}
          {step === 6 && (
            <div className="mb-8">
              <button
                onClick={renderPreview}
                className="px-6 py-3 bg-[#7C2D12] text-white rounded-xl font-semibold hover:bg-[#7C2D12]/90 transition-all duration-300"
              >
                测试预览渲染
              </button>
            </div>
          )}
          
          {/* 导航按钮 */}
          <div className="mt-12 sm:mt-16 flex flex-col sm:flex-row justify-between items-center gap-4">
            <button
              onClick={handlePrev}
              disabled={step === 1}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border border-[#7C2D12]/20 rounded-xl font-medium disabled:opacity-50 transition-all duration-300 hover:bg-[#FEF2F2] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#CA8A04]/30"
            >
              {t('customize.prev')}
            </button>
            
            {step < 7 ? (
              <button
                onClick={handleNext}
                disabled={step === 1 && !customData.teapotType}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-[#CA8A04] text-white rounded-xl font-semibold disabled:opacity-50 transition-all duration-300 hover:bg-[#CA8A04]/90 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#CA8A04]/50 transform hover:scale-105 active:scale-95"
              >
                {t('customize.next')}
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-[#CA8A04] text-white rounded-xl font-semibold transition-all duration-300 hover:bg-[#CA8A04]/90 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#CA8A04]/50 transform hover:scale-105 active:scale-95"
              >
                {t('customize.complete')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}