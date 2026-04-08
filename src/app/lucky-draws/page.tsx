"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface LuckyDrawItem {
  id: number;
  product_id: number;
  product_name: string;
  product_image: string;
  product_price: number;
  total_equity: number;
  current_equity: number;
  price_per_equity: number;
  start_time: string;
  end_time: string;
  status: string;
  locked_equity?: number;
}

export default function LuckyDrawsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [luckyDraws, setLuckyDraws] = useState<LuckyDrawItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedLuckyDraw, setSelectedLuckyDraw] = useState<LuckyDrawItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLuckyDraws();
  }, []);

  const fetchLuckyDraws = async () => {
    try {
      const response = await fetch("/api/lucky-draws");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched lucky draws:', data);
      if (data.success && data.luckyDraws && data.luckyDraws.length > 0) {
        setLuckyDraws(data.luckyDraws);
      } else {
        // API返回空数据，显示暂无活动
        setLuckyDraws([]);
      }
    } catch (error) {
      console.error("Error fetching lucky draws:", error);
      // API失败，显示暂无活动
      setLuckyDraws([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressPercentage = (current: number, total: number) => {
    return Math.round((current / total) * 100);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "进行中";
      case "completed":
        return "已结束";
      case "cancelled":
        return "已取消";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "completed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400";
    }
  };

  const handleOpenBuyModal = (draw: LuckyDrawItem) => {
    setSelectedLuckyDraw(draw);
    setQuantity(1);
    setError(null);
    setShowBuyModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLuckyDraw) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // 调用lock API锁定库存
      const response = await fetch('/api/lucky-draws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'lock',
          luckyDrawId: selectedLuckyDraw.id,
          userId: 1, // 这里应该从登录状态获取用户ID，暂时使用固定值
          quantity: quantity
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setShowBuyModal(false);
        // 跳转到支付页面，传递订单ID和过期时间
        router.push(`/lucky-draw/${selectedLuckyDraw.id}/pay?orderId=${result.data.orderId}&expiresAt=${result.data.expiresAt}`);
      } else {
        setError(result.message || '锁定库存失败，请稍后重试');
      }
    } catch (error) {
      console.error('Error locking equity:', error);
      setError('锁定库存失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF2F8] middle-east-pattern py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold font-['Noto_Naskh_Arabic'] text-[#831843] mb-8 text-center">
          {t("nav.luckyDraw", "一元购")}
        </h1>

        {isLoading ? (
          <div className="flex justify-center items-center h-64 glass-effect rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CA8A04]"></div>
          </div>
        ) : luckyDraws.length === 0 ? (
          <div className="glass-effect rounded-lg shadow-md p-8 text-center">
            <div className="flex justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#DB2777]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold font-['Noto_Naskh_Arabic'] text-[#831843] mb-4">
              暂无一元购活动
            </h2>
            <p className="text-[#831843]/70 mb-8 font-['Noto_Sans_Arabic']">
              一元购活动正在准备中，敬请期待！
            </p>
            <Link
              href="/products"
              className="inline-flex items-center px-6 py-3 bg-[#CA8A04] hover:bg-[#B47C03] text-white font-['Noto_Sans_Arabic'] font-medium rounded-md transition-colors"
            >
              {t("products.viewAll", "浏览所有商品")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {luckyDraws.map((draw) => (
              <div
                key={draw.id}
                className="glass-effect rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={draw.product_image}
                    alt={draw.product_name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(draw.status)}`}>
                      {getStatusText(draw.status)}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-semibold font-['Noto_Naskh_Arabic'] text-[#831843] mb-2 line-clamp-1">
                    {draw.product_name}
                  </h3>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-[#CA8A04] font-['Noto_Naskh_Arabic']">
                      ¥{draw.price_per_equity}
                    </span>
                    <span className="text-sm text-[#831843]/70 font-['Noto_Sans_Arabic']">
                      总{draw.total_equity}份
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#831843]/70 font-['Noto_Sans_Arabic']">
                        进度
                      </span>
                      <span className="font-semibold text-[#831843] font-['Noto_Sans_Arabic']">
                        {draw.current_equity}/{draw.total_equity}
                      </span>
                    </div>
                    <div className="w-full bg-[#DB2777]/20 rounded-full h-2">
                      <div
                        className="bg-[#CA8A04] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressPercentage(draw.current_equity, draw.total_equity)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Link
                      href={`/lucky-draw/${draw.id}`}
                      className="flex-1 bg-[#CA8A04] hover:bg-[#B47C03] text-white font-['Noto_Sans_Arabic'] text-sm font-medium py-2 px-4 rounded transition-colors duration-200 text-center"
                    >
                      查看详情
                    </Link>
                    {draw.status === "active" && (
                      <button
                        onClick={() => handleOpenBuyModal(draw)}
                        className="flex-1 bg-[#DB2777]/10 hover:bg-[#DB2777]/20 text-[#831843] font-['Noto_Sans_Arabic'] text-sm font-medium py-2 px-4 rounded transition-colors duration-200 text-center"
                      >
                        参与购买
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 购买浮窗 */}
      {showBuyModal && selectedLuckyDraw && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold font-['Noto_Naskh_Arabic'] text-[#831843]">参与一元购</h2>
              <button 
                onClick={() => setShowBuyModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <img 
                    src={selectedLuckyDraw.product_image} 
                    alt={selectedLuckyDraw.product_name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 font-['Noto_Naskh_Arabic'] text-[#831843]">{selectedLuckyDraw.product_name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#CA8A04] font-['Noto_Naskh_Arabic']">¥{selectedLuckyDraw.price_per_equity}</span>
                    <span className="text-sm text-[#831843]/70 font-['Noto_Sans_Arabic']">/份</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-2 font-['Noto_Sans_Arabic'] text-[#831843]">参与进度</h4>
                <div className="w-full bg-[#DB2777]/20 rounded-full h-2 mb-2">
                  <div 
                    className="bg-[#CA8A04] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage(selectedLuckyDraw.current_equity, selectedLuckyDraw.total_equity)}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm font-['Noto_Sans_Arabic'] text-[#831843]/70">
                  <span>{selectedLuckyDraw.current_equity}/{selectedLuckyDraw.total_equity}份</span>
                  <span>{getProgressPercentage(selectedLuckyDraw.current_equity, selectedLuckyDraw.total_equity)}%</span>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-2 font-['Noto_Sans_Arabic'] text-[#831843]">购买份数</h4>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 border border-[#831843]/30 rounded flex items-center justify-center text-[#831843]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    max={100}
                    className="flex-1 border border-[#831843]/30 rounded p-2 text-center font-['Noto_Sans_Arabic'] text-[#831843]"
                  />
                  <button 
                    onClick={() => setQuantity(Math.min(100, quantity + 1))}
                    className="w-8 h-8 border border-[#831843]/30 rounded flex items-center justify-center text-[#831843]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-[#831843]/70 mt-2 font-['Noto_Sans_Arabic']">最多可购买 100 份</p>
              </div>
              
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-2 font-['Noto_Sans_Arabic'] text-[#831843]">应付金额</h4>
                <div className="flex justify-between items-center">
                  <span className="font-['Noto_Sans_Arabic'] text-[#831843]">总计</span>
                  <span className="text-2xl font-bold text-[#CA8A04] font-['Noto_Naskh_Arabic']">¥{selectedLuckyDraw.price_per_equity * quantity}</span>
                </div>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm font-['Noto_Sans_Arabic']">
                  {error}
                </div>
              )}
              
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-[#CA8A04] hover:bg-[#B47C03] text-white font-['Noto_Sans_Arabic'] font-medium py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '处理中...' : `确认购买 ${quantity} 份`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}