"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

export function Contact() {
  const { t } = useTranslation();
  const [activeImage, setActiveImage] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // 联系我们数据
  const contact = {
    title: '联系我们',
    description: '如有任何疑问，请随时联系我们',
    images: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tea%20shop%20interior%20design%20traditional%20chinese%20style%20elegant&image_size=landscape_4_3',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20tea%20ceremony%20setup%20zisha%20teapot%20cultural%20heritage&image_size=landscape_4_3',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20pottery%20workshop%20craftsman%20working%20professional%20photography&image_size=landscape_4_3'
    ],
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    address: '中国江苏省宜兴市紫砂街123号',
    email: 'info@zishapottery.com',
    phone: '+86 123 4567 8910',
    openingHours: '周一至周五: 9:00 AM - 6:00 PM\n周六: 10:00 AM - 4:00 PM\n周日: 休息'
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate form submission
    setTimeout(() => {
      setSubmitSuccess(true);
      setFormData({ name: '', email: '', message: '' });
      setIsSubmitting(false);
      // Clear success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);
    }, 1000);
  };

  return (
    <section id="contact" className="py-20 px-4 bg-[#FEF2F2]">
      <div className="max-w-7xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6 font-['Noto_Serif_TC'] text-[#450A0A]">{contact.title}</h2>
          <p className="text-lg text-[#450A0A] max-w-2xl mx-auto font-['Noto_Sans_TC']">{contact.description}</p>
        </div>

        {/* Image Carousel */}
        {contact.images && Array.isArray(contact.images) && contact.images.length > 0 && (
          <div className="mb-16">
            <div className="relative rounded-lg overflow-hidden shadow-xl">
              <img 
                src={contact.images[activeImage]} 
                alt={`联系我们 - ${activeImage + 1}`} 
                className="w-full h-[500px] object-cover transition-opacity duration-500"
              />
              {/* Image Indicators */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3">
                {contact.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImage(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${activeImage === index ? 'bg-[#CA8A04] w-8' : 'bg-white/70'}`}
                  ></button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Contact Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Contact Form */}
          <div className="bg-white p-8 rounded-lg shadow-lg border border-[#7C2D12]/20 transition-all duration-300 hover:shadow-xl">
            <h3 className="text-3xl font-semibold mb-6 font-['Noto_Serif_TC'] text-[#450A0A]">发送消息</h3>
            
            {submitSuccess && (
              <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-lg font-['Noto_Sans_TC']">
                感谢您的留言！我们会尽快回复您。
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block mb-3 font-medium font-['Noto_Sans_TC'] text-[#450A0A]">{t('contact.form.name')}</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-[#7C2D12]/30 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CA8A04] focus:border-transparent font-['Noto_Sans_TC']"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block mb-3 font-medium font-['Noto_Sans_TC'] text-[#450A0A]">{t('contact.form.email')}</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-[#7C2D12]/30 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CA8A04] focus:border-transparent font-['Noto_Sans_TC']"
                  required
                />
              </div>
              <div>
                <label htmlFor="message" className="block mb-3 font-medium font-['Noto_Sans_TC'] text-[#450A0A]">{t('contact.form.message')}</label>
                <textarea 
                  id="message" 
                  name="message"
                  rows={5}
                  value={formData.message}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-[#7C2D12]/30 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CA8A04] focus:border-transparent font-['Noto_Sans_TC']"
                  required
                ></textarea>
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#CA8A04] hover:bg-[#B47C03] text-white px-8 py-4 rounded-md font-medium transition-all duration-300 transform hover:scale-105 w-full font-['Noto_Sans_TC'] text-lg"
              >
                {isSubmitting ? '发送中...' : t('contact.form.submit')}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-lg shadow-lg border border-[#7C2D12]/20 transition-all duration-300 hover:shadow-xl">
              <h3 className="text-3xl font-semibold mb-6 font-['Noto_Serif_TC'] text-[#450A0A]">联系信息</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-[#7C2D12]/10 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#7C2D12]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2 font-['Noto_Serif_TC'] text-[#450A0A]">地址</h4>
                    <p className="text-[#450A0A] font-['Noto_Sans_TC']">{contact.address}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-[#7C2D12]/10 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#7C2D12]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2 font-['Noto_Serif_TC'] text-[#450A0A]">邮箱</h4>
                    <p className="text-[#450A0A] font-['Noto_Sans_TC']">{contact.email}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-[#7C2D12]/10 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#7C2D12]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2 font-['Noto_Serif_TC'] text-[#450A0A]">电话</h4>
                    <p className="text-[#450A0A] font-['Noto_Sans_TC']">{contact.phone}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-lg border border-[#7C2D12]/20 transition-all duration-300 hover:shadow-xl">
              <h3 className="text-3xl font-semibold mb-6 font-['Noto_Serif_TC'] text-[#450A0A]">营业时间</h3>
              <pre className="text-[#450A0A] font-['Noto_Sans_TC'] whitespace-pre-wrap">{contact.openingHours}</pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}