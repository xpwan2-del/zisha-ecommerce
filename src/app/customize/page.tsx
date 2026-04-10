"use client";

import { useState, useEffect } from 'react';
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
        
        setTeapotTypes(teapotTypesData);
        setMaterials(materialsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);
  
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
    <div className="py-12 px-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-12 text-center text-amazon-dark dark:text-white tracking-tight">{t('customize.title')}</h1>
        
        {/* 进度条 */}
        <div className="mb-12 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            {[...Array(7)].map((_, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold mb-3 transition-all duration-300 ease-in-out ${step > index + 1 ? 'bg-amazon-orange text-white shadow-lg shadow-amazon-orange/20' : step === index + 1 ? 'bg-amazon-orange text-white shadow-lg shadow-amazon-orange/20 scale-110' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                  {index + 1}
                </div>
                <span className={`text-xs font-medium transition-all duration-300 ${step > index + 1 ? 'text-amazon-orange' : step === index + 1 ? 'text-amazon-orange font-semibold' : 'text-gray-500'}`}>
                  {t(`customize.step${index + 1}`)}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div className="bg-amazon-orange h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${((step - 1) / 6) * 100}%` }}></div>
          </div>
        </div>
        
        {/* 步骤内容 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 mb-8 border border-gray-100 dark:border-gray-700">
          {/* 步骤1：选择壶型 */}
          {step === 1 && (
            <div>
              <h2 className="text-3xl font-bold mb-8 text-amazon-dark dark:text-white tracking-tight">{t('customize.step1')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {teapotTypes.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => setCustomData({ ...customData, teapotType: type })}
                    className={`cursor-pointer border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl ${customData.teapotType?.id === type.id ? 'border-amazon-orange bg-amazon-orange/5 shadow-md shadow-amazon-orange/10' : 'border-gray-100 dark:border-gray-700 hover:border-amazon-orange hover:shadow-lg'}`}
                  >
                    <div className="aspect-square overflow-hidden relative group">
                      <img 
                        src={JSON.parse(type.images)[0] || `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20${type.name}&size=square`} 
                        alt={type.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {customData.teapotType?.id === type.id && (
                        <div className="absolute inset-0 bg-amazon-orange/20 flex items-center justify-center">
                          <div className="bg-white text-amazon-orange px-3 py-1 rounded-full text-sm font-medium">
                            已选择
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold mb-1 text-amazon-dark dark:text-white">{type.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{type.name_en}</p>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500">{type.min_capacity}-{type.max_capacity}ml</p>
                        <p className="text-sm font-bold text-amazon-orange">${type.base_price.toFixed(2)}</p>
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
              <h2 className="text-3xl font-bold mb-8 text-amazon-dark dark:text-white tracking-tight">{t('customize.step2')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {materials.map((material) => (
                  <div
                    key={material.id}
                    onClick={() => setCustomData({ ...customData, material })}
                    className={`cursor-pointer border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl ${customData.material?.id === material.id ? 'border-amazon-orange bg-amazon-orange/5 shadow-md shadow-amazon-orange/10' : 'border-gray-100 dark:border-gray-700 hover:border-amazon-orange hover:shadow-lg'}`}
                  >
                    <div className="aspect-square relative group">
                      <div 
                        className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundColor: material.color }}
                      ></div>
                      {customData.material?.id === material.id && (
                        <div className="absolute inset-0 bg-amazon-orange/20 flex items-center justify-center">
                          <div className="bg-white text-amazon-orange px-3 py-1 rounded-full text-sm font-medium">
                            已选择
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold mb-1 text-amazon-dark dark:text-white">{material.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{material.description}</p>
                      {material.price_modifier > 0 && (
                        <p className="text-sm font-bold text-amazon-orange">+${material.price_modifier.toFixed(2)}</p>
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
              <h2 className="text-3xl font-bold mb-8 text-amazon-dark dark:text-white tracking-tight">{t('customize.step3')}</h2>
              <div className="mb-10">
                <div className="mb-6">
                  <input
                    type="range"
                    min={customData.teapotType?.min_capacity || 100}
                    max={customData.teapotType?.max_capacity || 500}
                    value={customData.capacity}
                    onChange={(e) => setCustomData({ ...customData, capacity: parseInt(e.target.value) })}
                    className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{customData.teapotType?.min_capacity || 100}ml</span>
                  <div className="text-center">
                    <span className="text-3xl font-bold text-amazon-orange">{customData.capacity}</span>
                    <span className="text-lg text-gray-600 dark:text-gray-300 ml-1">ml</span>
                  </div>
                  <span className="text-sm text-gray-500">{customData.teapotType?.max_capacity || 500}ml</span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-amazon-orange/5 to-amazon-orange/10 dark:from-amazon-orange/10 dark:to-amazon-orange/20 p-6 rounded-xl border border-amazon-orange/20">
                <p className="text-sm text-gray-600 dark:text-gray-300">
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
              <h2 className="text-3xl font-bold mb-8 text-amazon-dark dark:text-white tracking-tight">{t('customize.step4')}</h2>
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
                  <div className="w-12 h-6 bg-gray-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amazon-orange"></div>
                  <span className="ml-3 text-sm font-medium text-amazon-dark dark:text-white">{t('customize.engraving_enable')}</span>
                </label>
                <span className="text-sm font-bold text-amazon-orange">+50 AED</span>
              </div>
              
              {customData.engraving.enabled && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3 text-amazon-dark dark:text-white">{t('customize.engraving_text')}</label>
                    <input
                      type="text"
                      value={customData.engraving.text}
                      onChange={(e) => setCustomData({ 
                        ...customData, 
                        engraving: { ...customData.engraving, text: e.target.value } 
                      })}
                      maxLength={20}
                      className="w-full px-5 py-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amazon-orange focus:border-transparent transition-all duration-200"
                      placeholder={t('customize.engraving_placeholder')}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500">{customData.engraving.text.length}/20</p>
                      <p className="text-xs text-gray-500">建议字数：2-8字</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-3 text-amazon-dark dark:text-white">{t('customize.engraving_font')}</label>
                    <div className="flex flex-wrap gap-3">
                      {['书法体', '楷体', '篆体', '英文无衬线', '英文字体'].map((font) => (
                        <button
                          key={font}
                          onClick={() => setCustomData({ 
                            ...customData, 
                            engraving: { ...customData.engraving, font } 
                          })}
                          className={`px-5 py-2.5 rounded-lg border transition-all duration-200 ${customData.engraving.font === font ? 'border-amazon-orange bg-amazon-orange/10 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-amazon-orange'}`}
                        >
                          {font}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-3 text-amazon-dark dark:text-white">{t('customize.engraving_position')}</label>
                    <div className="flex flex-wrap gap-3">
                      {['壶身正面', '壶身背面', '壶底'].map((position) => (
                        <button
                          key={position}
                          onClick={() => setCustomData({ 
                            ...customData, 
                            engraving: { ...customData.engraving, position } 
                          })}
                          className={`px-5 py-2.5 rounded-lg border transition-all duration-200 ${customData.engraving.position === position ? 'border-amazon-orange bg-amazon-orange/10 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-amazon-orange'}`}
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
              <h2 className="text-3xl font-bold mb-8 text-amazon-dark dark:text-white tracking-tight">{t('customize.step5')}</h2>
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
                  <div className="w-12 h-6 bg-gray-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amazon-orange"></div>
                  <span className="ml-3 text-sm font-medium text-amazon-dark dark:text-white">{t('customize.pattern_enable')}</span>
                </label>
                <span className="text-sm font-bold text-amazon-orange">+30 AED</span>
              </div>
              
              {customData.pattern.enabled && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3 text-amazon-dark dark:text-white">{t('customize.pattern_method')}</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setCustomData({ 
                          ...customData, 
                          pattern: { ...customData.pattern, type: 'template' } 
                        })}
                        className={`flex-1 py-3 rounded-lg transition-all duration-200 ${customData.pattern.type === 'template' ? 'bg-amazon-orange text-white shadow-md' : 'border border-gray-200 dark:border-gray-700 hover:border-amazon-orange'}`}
                      >
                        {t('customize.pattern_template')}
                      </button>
                      <button
                        onClick={() => setCustomData({ 
                          ...customData, 
                          pattern: { ...customData.pattern, type: 'upload' } 
                        })}
                        className={`flex-1 py-3 rounded-lg transition-all duration-200 ${customData.pattern.type === 'upload' ? 'bg-amazon-orange text-white shadow-md' : 'border border-gray-200 dark:border-gray-700 hover:border-amazon-orange'}`}
                      >
                        {t('customize.pattern_upload')}
                      </button>
                    </div>
                  </div>
                  
                  {customData.pattern.type === 'template' && (
                    <div>
                      <label className="block text-sm font-medium mb-3 text-amazon-dark dark:text-white">{t('customize.pattern_template')}</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {['传统纹样', '花卉', '诗词', '定制Logo'].map((template) => (
                          <button
                            key={template}
                            onClick={() => setCustomData({ 
                              ...customData, 
                              pattern: { ...customData.pattern, template } 
                            })}
                            className={`px-4 py-2.5 rounded-lg border text-sm transition-all duration-200 ${customData.pattern.template === template ? 'border-amazon-orange bg-amazon-orange/10 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-amazon-orange'}`}
                          >
                            {template}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {customData.pattern.type === 'upload' && (
                    <div>
                      <label className="block text-sm font-medium mb-3 text-amazon-dark dark:text-white">{t('customize.pattern_upload')}</label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-amazon-orange transition-colors duration-200">
                        <input
                          type="file"
                          accept="image/*"
                          className="w-full px-5 py-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-3">{t('customize.pattern_upload_note')}</p>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-3 text-amazon-dark dark:text-white">{t('customize.pattern_position')}</label>
                    <div className="flex flex-wrap gap-3">
                      {['壶身正面', '壶身背面'].map((position) => (
                        <button
                          key={position}
                          onClick={() => setCustomData({ 
                            ...customData, 
                            pattern: { ...customData.pattern, position } 
                          })}
                          className={`px-5 py-2.5 rounded-lg border transition-all duration-200 ${customData.pattern.position === position ? 'border-amazon-orange bg-amazon-orange/10 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-amazon-orange'}`}
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
              <h2 className="text-3xl font-bold mb-8 text-amazon-dark dark:text-white tracking-tight">{t('customize.step6')}</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-8 flex items-center justify-center shadow-sm">
                  <div className="text-center">
                    <div className="mb-6">
                      <img 
                        src={customData.teapotType?.images ? JSON.parse(customData.teapotType.images)[0] : `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20${customData.teapotType?.name}&size=square`} 
                        alt={customData.teapotType?.name} 
                        className="w-72 h-72 object-contain mx-auto transition-all duration-500 hover:scale-105"
                      />
                    </div>
                    <p className="text-sm text-gray-500">{t('customize.preview_loading')}</p>
                  </div>
                </div>
                
                <div className="space-y-5">
                  <h3 className="text-xl font-semibold text-amazon-dark dark:text-white">{t('customize.customization_details')}</h3>
                  <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-600">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600">
                        <span className="text-gray-600 dark:text-gray-300">{t('customize.teapot_type')}:</span>
                        <span className="font-medium text-amazon-dark dark:text-white">{customData.teapotType?.name}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600">
                        <span className="text-gray-600 dark:text-gray-300">{t('customize.material')}:</span>
                        <span className="font-medium text-amazon-dark dark:text-white">{customData.material?.name}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600">
                        <span className="text-gray-600 dark:text-gray-300">{t('customize.capacity')}:</span>
                        <span className="font-medium text-amazon-dark dark:text-white">{customData.capacity}ml</span>
                      </div>
                      {customData.engraving.enabled && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600">
                          <span className="text-gray-600 dark:text-gray-300">{t('customize.engraving')}:</span>
                          <span className="font-medium text-amazon-dark dark:text-white">{customData.engraving.text}</span>
                        </div>
                      )}
                      {customData.pattern.enabled && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600">
                          <span className="text-gray-600 dark:text-gray-300">{t('customize.pattern')}:</span>
                          <span className="font-medium text-amazon-dark dark:text-white">{customData.pattern.type === 'template' ? customData.pattern.template : t('customize.uploaded_image')}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold pt-4 mt-2">
                        <span className="text-amazon-dark dark:text-white">{t('customize.total_price')}:</span>
                        <span className="text-amazon-orange text-2xl">{calculatePrice().toFixed(2)} AED</span>
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
              <h2 className="text-3xl font-bold mb-8 text-amazon-dark dark:text-white tracking-tight">{t('customize.step7')}</h2>
              <div className="space-y-8">
                <div className="bg-gradient-to-br from-amazon-orange/5 to-amazon-orange/10 dark:from-amazon-orange/10 dark:to-amazon-orange/20 p-6 rounded-xl border border-amazon-orange/20 shadow-sm">
                  <h3 className="text-xl font-semibold mb-6 text-amazon-dark dark:text-white">{t('customize.order_summary')}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-amazon-orange/10">
                      <span className="text-gray-600 dark:text-gray-300">{t('customize.teapot_type')}:</span>
                      <span className="font-medium text-amazon-dark dark:text-white">{customData.teapotType?.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-amazon-orange/10">
                      <span className="text-gray-600 dark:text-gray-300">{t('customize.material')}:</span>
                      <span className="font-medium text-amazon-dark dark:text-white">{customData.material?.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-amazon-orange/10">
                      <span className="text-gray-600 dark:text-gray-300">{t('customize.capacity')}:</span>
                      <span className="font-medium text-amazon-dark dark:text-white">{customData.capacity}ml</span>
                    </div>
                    {customData.engraving.enabled && (
                      <div className="flex justify-between items-center py-2 border-b border-amazon-orange/10">
                        <span className="text-gray-600 dark:text-gray-300">{t('customize.engraving')}:</span>
                        <span className="font-medium text-amazon-orange">+50 AED</span>
                      </div>
                    )}
                    {customData.pattern.enabled && (
                      <div className="flex justify-between items-center py-2 border-b border-amazon-orange/10">
                        <span className="text-gray-600 dark:text-gray-300">{t('customize.pattern')}:</span>
                        <span className="font-medium text-amazon-orange">+30 AED</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold pt-4 mt-2">
                      <span className="text-amazon-dark dark:text-white">{t('customize.total_price')}:</span>
                      <span className="text-amazon-orange text-2xl">{calculatePrice().toFixed(2)} AED</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-amazon-dark dark:text-white">{t('customize.notes')}</h3>
                  <textarea
                    className="w-full px-5 py-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amazon-orange focus:border-transparent transition-all duration-200"
                    rows={4}
                    placeholder={t('customize.notes_placeholder')}
                  ></textarea>
                </div>
              </div>
            </div>
          )}
          
          {/* 导航按钮 */}
          <div className="mt-16 flex justify-between items-center">
            <button
              onClick={handlePrev}
              disabled={step === 1}
              className="px-8 py-4 border border-gray-200 dark:border-gray-700 rounded-xl font-medium disabled:opacity-50 transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              {t('customize.prev')}
            </button>
            
            {step < 7 ? (
              <button
                onClick={handleNext}
                disabled={step === 1 && !customData.teapotType}
                className="px-8 py-4 bg-amazon-orange text-amazon-dark rounded-xl font-semibold disabled:opacity-50 transition-all duration-300 hover:bg-amazon-light-orange hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amazon-orange/50 transform hover:scale-105 active:scale-95"
              >
                {t('customize.next')}
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="px-8 py-4 bg-amazon-orange text-amazon-dark rounded-xl font-semibold transition-all duration-300 hover:bg-amazon-light-orange hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amazon-orange/50 transform hover:scale-105 active:scale-95"
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