"use client";

import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();
  const links = t('footer.links', { returnObjects: true }) as { home: string; shop: string; about: string; contact: string };

  return (
    <footer className="bg-dark text-light py-12 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-xl font-bold mb-4">Zisha Pottery</h3>
          <p className="text-gray-400">Authentic Chinese Zisha pottery for tea enthusiasts around the world.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-4">{t('footer.links.home')}</h4>
          <ul className="space-y-2">
            <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{links.home}</a></li>
            <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{links.shop}</a></li>
            <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{links.about}</a></li>
            <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{links.contact}</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-4">Categories</h4>
          <ul className="space-y-2">
            <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Teapots</a></li>
            <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Cups</a></li>
            <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Accessories</a></li>
            <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Sets</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-4">Contact</h4>
          <ul className="space-y-2">
            <li className="text-gray-400">info@zishapottery.com</li>
            <li className="text-gray-400">+86 123 4567 8910</li>
            <li className="text-gray-400">123 Zisha Street, Yixing, China</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-700 text-center text-gray-400">
        <p>{t('footer.copyright')}</p>
      </div>
    </footer>
  );
}