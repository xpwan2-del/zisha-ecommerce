"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * useBFCacheDefense - 往返缓存防御 Hook
 * 当检测到页面是从浏览器缓存恢复（如点“后退”按钮）时，强制刷新或执行逻辑。
 */
export function useBFCacheDefense() {
  const router = useRouter();

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // 说明是从浏览器缓存恢复的（BFCache）
        // 强制刷新页面以触发 Middleware 重新验证和 Context 重新加载
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);
}
