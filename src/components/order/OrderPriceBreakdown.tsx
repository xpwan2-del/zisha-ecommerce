'use client';

import { useTranslation } from 'react-i18next';
import { convertFromUSD } from '@/lib/utils/currency';
import Image from 'next/image';

export interface OrderPricePromotion {
  id?: number;
  name: string;
  discount?: number;
  percent?: number;
  baseAmount?: number;
  name_en?: string;
  name_ar?: string;
}

export interface OrderPriceCoupon {
  id?: number;
  coupon_id?: number;
  code: string;
  name?: string;
  name_en?: string;
  name_ar?: string;
  type?: string;
  value?: number;
  is_stackable?: number;
}

export interface OrderPriceBreakdownItem {
  productId: number;
  name: string;
  name_en?: string;
  name_ar?: string;
  image: string;
  unitPriceUsd: number;
  quantity: number;
  promotions: OrderPricePromotion[];
  discountUsd: number;
}

export interface OrderPriceBreakdownProps {
  productTotalUsd: number;
  unitPriceUsd?: number;
  quantity?: number;
  promotions?: OrderPricePromotion[];
  promotionSubtotalUsd?: number;
  coupon?: OrderPriceCoupon | null;
  couponDiscountUsd?: number;
  couponSubtotalUsd?: number;
  shippingUsd?: number;
  totalUsd: number;
  showProductCalculation?: boolean;
  items?: OrderPriceBreakdownItem[];
}

function moneyParts(amountUsd: number) {
  const converted = convertFromUSD(Number(amountUsd) || 0);
  return {
    usd: converted.usd,
    cny: converted.cny,
    aed: converted.aed,
  };
}

export function formatUsdOnly(amountUsd: number) {
  return `$${moneyParts(amountUsd).usd.toFixed(2)}`;
}

function PriceMoney({ amountUsd, strong = false }: { amountUsd: number; strong?: boolean }) {
  const amount = moneyParts(amountUsd);

  return (
    <div className="text-right leading-tight">
      <div className={strong ? 'text-xl font-bold text-[var(--primary)]' : 'text-base font-semibold text-[var(--text)]'}>
        ${amount.usd.toFixed(2)}
      </div>
      <div className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">
        (¥{amount.cny.toFixed(2)} / AED{amount.aed.toFixed(2)})
      </div>
    </div>
  );
}

function InlinePriceResult({ amountUsd }: { amountUsd: number }) {
  const amount = moneyParts(amountUsd);

  return (
    <div className="text-right leading-tight">
      <div className="text-sm font-semibold text-[var(--text)] whitespace-nowrap">
        ${amount.usd.toFixed(2)}
      </div>
      <div className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">
        (¥{amount.cny.toFixed(2)} / AED{amount.aed.toFixed(2)})
      </div>
    </div>
  );
}

function couponName(lang: string, coupon: OrderPriceCoupon) {
  if (lang === 'ar' && coupon.name_ar) return coupon.name_ar;
  if (lang === 'en' && coupon.name_en) return coupon.name_en;
  return coupon.name || coupon.code;
}

function CouponMiniCard({ coupon, lang }: { coupon: OrderPriceCoupon; lang: string }) {
  const stackableLabel = lang === 'ar' ? 'قابل للتكديس' : lang === 'en' ? 'Stackable' : '可叠加';
  const couponLabel = lang === 'ar' ? 'قسيمة' : lang === 'en' ? 'Coupon' : '优惠券';
  const displayName = couponName(lang, coupon);

  return (
    <div className="h-[58px] w-[180px] overflow-hidden" data-coupon-mini-card="scaled">
      <div className="origin-top-left scale-50 w-[360px] rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="flex min-h-[108px]">
          <div className="w-[120px] shrink-0 p-3 flex flex-col items-center justify-center bg-gradient-to-br from-accent to-accent-hover text-white">
            <span className="text-2xl font-bold leading-none">
              {coupon.type === 'percentage' ? `${Number(coupon.value || 0)}%` : `$${Number(coupon.value || 0).toFixed(2)}`}
            </span>
            <span className="text-[10px] mt-2 bg-white/20 px-2 py-0.5 rounded-full">
              {coupon.is_stackable === 1 ? stackableLabel : couponLabel}
            </span>
          </div>
          <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-[var(--text)] truncate">{displayName}</div>
              <div className="text-sm text-[var(--text-muted)] truncate">{coupon.code}</div>
            </div>
            <div className="text-xs text-[var(--accent)] font-medium">{couponLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function labelText(lang: string, zh: string, en: string, ar: string) {
  if (lang === 'ar') return ar;
  if (lang === 'en') return en;
  return zh;
}

function promoName(lang: string, promo: OrderPricePromotion) {
  if (lang === 'ar' && promo.name_ar) return promo.name_ar;
  if (lang === 'en' && promo.name_en) return promo.name_en;
  return promo.name;
}

function ItemPromotionBadges({ promotions, lang }: { promotions: OrderPricePromotion[]; lang: string }) {
  if (promotions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {promotions.map((promo, idx) => (
        <span key={`badge-${idx}`} className="promotion-badge inline-flex items-center gap-1 max-w-full">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
          </svg>
          <span className="truncate">{promoName(lang, promo)} {Number(promo.percent || 0)}%</span>
        </span>
      ))}
    </div>
  );
}

function ItemCalculationFormula({
  unitPriceUsd,
  promotions,
  quantity,
}: {
  unitPriceUsd: number;
  promotions: OrderPricePromotion[];
  quantity: number;
}) {
  if (promotions.length === 0) {
    return (
      <span className="text-xs text-[var(--text-muted)]">
        {formatUsdOnly(unitPriceUsd)} × {quantity}
      </span>
    );
  }

  if (promotions.length === 1) {
    return (
      <span className="text-xs text-[var(--text-muted)]">
        {formatUsdOnly(unitPriceUsd)} × {Number(promotions[0].percent || 0)}% × {quantity}
      </span>
    );
  }

  const stackedFactors = promotions.map((p) => `(1-${Number(p.percent || 0)}%)`).join(' × ');
  return (
    <span className="text-xs text-[var(--text-muted)]">
      {formatUsdOnly(unitPriceUsd)} × (1-{stackedFactors}) × {quantity}
    </span>
  );
}

function ItemDiscountLabel({ amountUsd, lang }: { amountUsd: number; lang: string }) {
  return (
    <div className="text-right leading-tight">
      <div className="text-sm font-semibold text-[var(--text)] whitespace-nowrap">
        {labelText(lang, '促销优惠金额', 'Promotion discount', 'خصم العرض')} ${moneyParts(amountUsd).usd.toFixed(2)}
      </div>
      <div className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">
        (¥{moneyParts(amountUsd).cny.toFixed(2)} / AED{moneyParts(amountUsd).aed.toFixed(2)})
      </div>
    </div>
  );
}

function OrderPriceBreakdownItemBlock({
  item,
  lang,
}: {
  item: OrderPriceBreakdownItem;
  lang: string;
}) {
  const productName = lang === 'ar' ? (item.name_ar || item.name) : lang === 'en' ? (item.name_en || item.name) : item.name;

  return (
    <div className="py-2">
      <div className="flex items-start gap-2 mb-1">
        <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-[var(--bg)]">
          <Image
            src={item.image || '/placeholder.jpg'}
            alt={productName}
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <ItemPromotionBadges promotions={item.promotions} lang={lang} />
        </div>
      </div>
      <div className="text-xs font-medium text-[var(--text)] mb-1 truncate">{productName}</div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(120px,auto)] items-center gap-2">
        <div className="min-w-0" data-price-side="calculation">
          <ItemCalculationFormula
            unitPriceUsd={item.unitPriceUsd}
            promotions={item.promotions}
            quantity={item.quantity}
          />
        </div>
        <div className="justify-self-end" data-price-side="result">
          <ItemDiscountLabel amountUsd={item.discountUsd} lang={lang} />
        </div>
      </div>
    </div>
  );
}

function PriceBreakdownRow({
  title,
  calculation,
  result,
  compact = false,
}: {
  title: string;
  calculation: React.ReactNode;
  result: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={compact ? 'py-2' : 'py-2.5'}>
      <div className="mb-1 text-xs font-medium text-[var(--text-muted)]">{title}</div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(120px,auto)] items-center gap-2">
        <div className="min-w-0 text-xs text-[var(--text-muted)]" data-price-side="calculation">
          {calculation}
        </div>
        <div className="justify-self-end text-right" data-price-side="result">
          {result}
        </div>
      </div>
    </section>
  );
}

export default function OrderPriceBreakdown({
  productTotalUsd,
  unitPriceUsd,
  quantity = 1,
  promotions = [],
  promotionSubtotalUsd,
  coupon,
  couponDiscountUsd = 0,
  couponSubtotalUsd,
  shippingUsd = 0,
  totalUsd,
  showProductCalculation = true,
  items,
}: OrderPriceBreakdownProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const appliedPromotions = promotions.filter((promotion) => Number(promotion.discount || 0) > 0);
  const promotionDiscountTotal = appliedPromotions.reduce((sum, item) => sum + Number(item.discount || 0), 0);
  const subtotalAfterPromotions = promotionSubtotalUsd ?? productTotalUsd - promotionDiscountTotal;
  const subtotalAfterCoupon = couponSubtotalUsd ?? subtotalAfterPromotions - couponDiscountUsd;
  const finalTotal = totalUsd || subtotalAfterCoupon + shippingUsd;
  const hasItems = items && items.length > 0;

  return (
    <div className="space-y-2 divide-y divide-[var(--border)]" data-price-breakdown="unified">
      <PriceBreakdownRow
        compact
        title={labelText(lang, '商品总价', 'Product Total', 'إجمالي المنتجات')}
        calculation={showProductCalculation && unitPriceUsd !== undefined ? (
          <span>{formatUsdOnly(unitPriceUsd)} × {quantity}</span>
        ) : (
          <span>{formatUsdOnly(productTotalUsd)}</span>
        )}
        result={<PriceMoney amountUsd={productTotalUsd} strong />}
      />

      {hasItems && items!.map((item) => (
        <OrderPriceBreakdownItemBlock
          key={`item-${item.productId}`}
          item={item}
          lang={lang}
        />
      ))}

      {!hasItems && appliedPromotions.map((promotion) => (
        <PriceBreakdownRow
          key={`price-promo-${promotion.id || promotion.name}`}
          compact
          title={labelText(lang, '促销优惠', 'Promotion Discount', 'خصم العرض')}
          calculation={
            <span className="text-xs text-[var(--text-muted)]">
              {formatUsdOnly(promotion.baseAmount ?? productTotalUsd)} × {Number(promotion.percent || 0)}%
            </span>
          }
          result={
            <InlinePriceResult amountUsd={Number(promotion.discount || 0)} />
          }
        />
      ))}

      {appliedPromotions.length > 0 && (
        <PriceBreakdownRow
          compact
          title={labelText(lang, '促销后小计', 'Subtotal After Promotion', 'المجموع بعد العرض')}
          calculation={<span>{formatUsdOnly(productTotalUsd)} - {formatUsdOnly(promotionDiscountTotal)}</span>}
          result={<PriceMoney amountUsd={subtotalAfterPromotions} />}
        />
      )}

      {coupon && couponDiscountUsd > 0 && (
        <PriceBreakdownRow
          compact
          title={labelText(lang, '优惠券', 'Coupon', 'القسيمة')}
          calculation={(
            <div className="space-y-1">
              <CouponMiniCard coupon={coupon} lang={lang} />
              <div>{formatUsdOnly(subtotalAfterPromotions)} × {coupon.value}{coupon.type === 'percentage' ? '%' : ''}</div>
            </div>
          )}
          result={
            <div className="text-right leading-tight">
              <div className="text-sm font-semibold text-[var(--text)] whitespace-nowrap">
                {labelText(lang, '优惠券优惠金额', 'Coupon discount', 'خصم القسيمة')} ${moneyParts(couponDiscountUsd).usd.toFixed(2)}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                (¥{moneyParts(couponDiscountUsd).cny.toFixed(2)} / AED{moneyParts(couponDiscountUsd).aed.toFixed(2)})
              </div>
            </div>
          }
        />
      )}

      {couponDiscountUsd > 0 && (
        <PriceBreakdownRow
          compact
          title={labelText(lang, '券后小计', 'Subtotal After Coupon', 'المجموع بعد القسيمة')}
          calculation={<span>{formatUsdOnly(subtotalAfterPromotions)} - {formatUsdOnly(couponDiscountUsd)}</span>}
          result={<PriceMoney amountUsd={subtotalAfterCoupon} />}
        />
      )}

      <PriceBreakdownRow
        compact
        title={labelText(lang, '运费', 'Shipping', 'الشحن')}
        calculation={<span>{shippingUsd > 0 ? formatUsdOnly(shippingUsd) : labelText(lang, '免费', 'Free', 'مجاني')}</span>}
        result={shippingUsd > 0 ? (
          <PriceMoney amountUsd={shippingUsd} />
        ) : (
          <div className="text-right text-sm font-semibold text-[var(--color-green)] whitespace-nowrap">
            {labelText(lang, '免费', 'Free', 'مجاني')}
          </div>
        )}
      />

      <PriceBreakdownRow
        compact
        title={labelText(lang, '合计', 'Total', 'الإجمالي')}
        calculation={<span>{formatUsdOnly(subtotalAfterCoupon)} + {formatUsdOnly(shippingUsd)}</span>}
        result={<PriceMoney amountUsd={finalTotal} strong />}
      />
    </div>
  );
}
