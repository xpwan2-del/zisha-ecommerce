"use client";

import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();
  const links = t('footer.links', { returnObjects: true }) as { home: string; shop: string; about: string; contact: string };

  return (
    <footer className="bg-dark text-light py-16 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Brand Section */}
        <div>
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 flex items-center justify-center bg-accent rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <span className="ml-3 text-2xl font-semibold tracking-wide" style={{ fontFamily: 'Cormorant, serif' }}>
              紫砂陶艺
            </span>
          </div>
          <p className="text-text-muted leading-relaxed text-sm">
            为世界各地的茶爱好者提供正宗的中国紫砂陶艺，传承千年工艺，品味生活之美。
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-base font-semibold mb-6 tracking-wide text-accent" style={{ fontFamily: 'Cormorant, serif' }}>
            快速链接
          </h4>
          <ul className="space-y-4">
            <li>
              <a href="/" className="text-text-muted hover:text-accent transition-colors duration-300 text-sm">
                {links.home || '首页'}
              </a>
            </li>
            <li>
              <a href="/products" className="text-text-muted hover:text-accent transition-colors duration-300 text-sm">
                {links.shop || '所有商品'}
              </a>
            </li>
            <li>
              <a href="/about" className="text-text-muted hover:text-accent transition-colors duration-300 text-sm">
                {links.about || '关于我们'}
              </a>
            </li>
            <li>
              <a href="/contact" className="text-text-muted hover:text-accent transition-colors duration-300 text-sm">
                {links.contact || '联系我们'}
              </a>
            </li>
          </ul>
        </div>

        {/* Categories */}
        <div>
          <h4 className="text-base font-semibold mb-6 tracking-wide text-accent" style={{ fontFamily: 'Cormorant, serif' }}>
            产品分类
          </h4>
          <ul className="space-y-4">
            <li>
              <a href="/products?category=1" className="text-text-muted hover:text-accent transition-colors duration-300 text-sm">
                茶壶
              </a>
            </li>
            <li>
              <a href="/products?category=2" className="text-text-muted hover:text-accent transition-colors duration-300 text-sm">
                茶杯
              </a>
            </li>
            <li>
              <a href="/products?category=3" className="text-text-muted hover:text-accent transition-colors duration-300 text-sm">
                配件
              </a>
            </li>
            <li>
              <a href="/products?category=4" className="text-text-muted hover:text-accent transition-colors duration-300 text-sm">
                套装
              </a>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <h4 className="text-base font-semibold mb-6 tracking-wide text-accent" style={{ fontFamily: 'Cormorant, serif' }}>
            联系我们
          </h4>
          <ul className="space-y-4">
            <li className="flex items-start space-x-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-text-muted text-sm">info@zishapottery.com</span>
            </li>
            <li className="flex items-start space-x-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-text-muted text-sm">+86 123 4567 8910</span>
            </li>
            <li className="flex items-start space-x-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-text-muted text-sm">中国江苏省宜兴市紫砂街123号</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-border">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-text-muted text-sm">
            {t('footer.copyright') || '© 2024 Zisha Pottery. All rights reserved.'}
          </p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <a href="/privacy" className="text-text-muted hover:text-accent text-sm transition-colors duration-300">
              隐私政策
            </a>
            <a href="/terms" className="text-text-muted hover:text-accent text-sm transition-colors duration-300">
              服务条款
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
