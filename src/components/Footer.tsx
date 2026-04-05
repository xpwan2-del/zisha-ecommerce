"use client";

import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();
  const links = t('footer.links', { returnObjects: true }) as { home: string; shop: string; about: string; contact: string };

  return (
    <footer className="bg-[#450A0A] text-white py-16 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <h3 className="text-2xl font-bold mb-6 font-['Noto_Serif_TC']">紫砂陶艺</h3>
          <p className="text-[#FEF2F2]/80 font-['Noto_Sans_TC']">为世界各地的茶爱好者提供正宗的中国紫砂陶艺。</p>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-4 font-['Noto_Serif_TC']">{t('footer.links.home')}</h4>
          <ul className="space-y-3">
            <li><a href="/" className="text-[#FEF2F2]/70 hover:text-white transition-colors duration-300 font-['Noto_Sans_TC']">{links.home}</a></li>
            <li><a href="/products" className="text-[#FEF2F2]/70 hover:text-white transition-colors duration-300 font-['Noto_Sans_TC']">{links.shop}</a></li>
            <li><a href="/about" className="text-[#FEF2F2]/70 hover:text-white transition-colors duration-300 font-['Noto_Sans_TC']">{links.about}</a></li>
            <li><a href="/contact" className="text-[#FEF2F2]/70 hover:text-white transition-colors duration-300 font-['Noto_Sans_TC']">{links.contact}</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-4 font-['Noto_Serif_TC']">分类</h4>
          <ul className="space-y-3">
            <li><a href="/products?category=1" className="text-[#FEF2F2]/70 hover:text-white transition-colors duration-300 font-['Noto_Sans_TC']">茶壶</a></li>
            <li><a href="/products?category=2" className="text-[#FEF2F2]/70 hover:text-white transition-colors duration-300 font-['Noto_Sans_TC']">茶杯</a></li>
            <li><a href="/products?category=3" className="text-[#FEF2F2]/70 hover:text-white transition-colors duration-300 font-['Noto_Sans_TC']">配件</a></li>
            <li><a href="/products?category=4" className="text-[#FEF2F2]/70 hover:text-white transition-colors duration-300 font-['Noto_Sans_TC']">套装</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-4 font-['Noto_Serif_TC']">联系我们</h4>
          <ul className="space-y-3">
            <li className="text-[#FEF2F2]/80 font-['Noto_Sans_TC']">info@zishapottery.com</li>
            <li className="text-[#FEF2F2]/80 font-['Noto_Sans_TC']">+86 123 4567 8910</li>
            <li className="text-[#FEF2F2]/80 font-['Noto_Sans_TC']">中国江苏省宜兴市紫砂街123号</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-[#7C2D12] text-center text-[#FEF2F2]/70 font-['Noto_Sans_TC']">
        <p>{t('footer.copyright')}</p>
      </div>
    </footer>
  );
}