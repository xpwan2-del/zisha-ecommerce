"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useTranslation } from "react-i18next";

export default function GlobalLoadingOverlay() {
  const { isNavigating } = useAuth();
  const { i18n } = useTranslation();

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="text-center p-10 bg-card/95 rounded-2xl shadow-2xl border border-border/50 max-w-sm w-full mx-4">
        <div className="loading-spinner-lg mx-auto mb-8"></div>
        <p className="text-xl font-bold text-text tracking-wider text-center w-full block">
          {i18n.language === 'ar' ? 'جاري الانتقال...' : i18n.language === 'en' ? 'Processing...' : '正在处理中...'}
        </p>
        <p className="text-sm text-text-muted mt-4 text-center w-full block">
          {i18n.language === 'ar' ? 'يرجى الانتظار، لا تغلق الصفحة' : i18n.language === 'en' ? 'Please wait, do not close the page' : '请稍候，不要关闭或刷新页面'}
        </p>
      </div>
    </div>
  );
}
