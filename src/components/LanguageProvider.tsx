"use client";

import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/i18n";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Wait for i18n to be initialized
    if (i18n.isInitialized) {
      setIsReady(true);
    } else {
      const handleInit = () => setIsReady(true);
      i18n.on('initialized', handleInit);
      return () => i18n.off('initialized', handleInit);
    }
  }, []);

  if (!isReady) {
    return null;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
