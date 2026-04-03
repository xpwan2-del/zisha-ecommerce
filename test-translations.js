const translationsData = {
  "en": {
    "products": {
      "filters": "Filters",
      "price_range": "Price Range",
      "materials": "Materials",
      "capacity": "Capacity",
      "apply_filters": "Apply Filters",
      "prev": "Previous",
      "specifications": "Specifications",
      "service_commitments": "Service Commitments",
      "7day_return": "7-day Return",
      "free_shipping": "Free Shipping",
      "authentic_guarantee": "Authentic Guarantee",
      "secure_payment": "Secure Payment",
      "shipping_info": "Shipping Info",
      "after_sale": "After Sale",
      "weight": "Weight",
      "size": "Size",
      "color": "Color",
      "other": "Other",
      "leave_review": "Leave a Review",
      "rating": "Rating",
      "comment": "Comment",
      "add_to_cart": "Add to Cart",
      "buy_now": "Buy Now",
      "description": "Description",
      "reviews": "Reviews"
    }
  },
  "zh": {
    "products": {
      "filters": "筛选",
      "price_range": "价格范围",
      "materials": "材质",
      "capacity": "容量",
      "apply_filters": "应用筛选",
      "prev": "上一页",
      "specifications": "规格参数",
      "service_commitments": "服务承诺",
      "7day_return": "7天退换",
      "free_shipping": "免费配送",
      "authentic_guarantee": "正品保障",
      "secure_payment": "安全支付",
      "shipping_info": "配送信息",
      "after_sale": "售后服务",
      "weight": "重量",
      "size": "尺寸",
      "color": "颜色",
      "other": "其他",
      "leave_review": "留下评价",
      "rating": "评分",
      "comment": "评论",
      "add_to_cart": "加入购物车",
      "buy_now": "立即购买",
      "description": "描述",
      "reviews": "评价"
    }
  },
  "ar": {
    "products": {
      "filters": "مرشحات",
      "price_range": "نطاق السعر",
      "materials": "المواد",
      "capacity": "السعة",
      "apply_filters": "تطبيق المرشحات",
      "prev": "السابق",
      "specifications": "المواصفات",
      "service_commitments": "التعهدات الخدمية",
      "7day_return": "استرداد لمدة 7 أيام",
      "free_shipping": "شحن مجاني",
      "authentic_guarantee": "ضمان أصالة",
      "secure_payment": "دفع آمن",
      "shipping_info": "معلومات الشحن",
      "after_sale": "بعد البيع",
      "weight": "الوزن",
      "size": "الحجم",
      "color": "اللون",
      "other": "آخر",
      "leave_review": "اترك تقييمًا",
      "rating": "التقييم",
      "comment": "التعليق",
      "add_to_cart": "أضف إلى السلة",
      "buy_now": "اشتر الآن",
      "description": "الوصف",
      "reviews": "التقييمات"
    }
  }
};

// 将对象转换为数组格式
const translationsArray = [];
let idCounter = 1;

Object.keys(translationsData).forEach(language => {
  const languageData = translationsData[language];
  Object.keys(languageData).forEach(section => {
    const sectionData = languageData[section];
    Object.keys(sectionData).forEach(key => {
      const value = sectionData[key];
      if (typeof value === 'string' && value) {
        translationsArray.push({
          id: idCounter++,
          key: `${section}.${key}`,
          language,
          value,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    });
  });
});

console.log(`Total translations: ${translationsArray.length}`);
console.log('Sample translations:');
console.log(translationsArray.slice(0, 5).map(t => `${t.key} (${t.language}): ${t.value}`).join('\n'));

// 测试过滤功能
const search = 'filters';
const filtered = translationsArray.filter(t => 
  t.key.toLowerCase().includes(search.toLowerCase()) ||
  t.value.toLowerCase().includes(search.toLowerCase())
);
console.log(`\nSearch results for "${search}": ${filtered.length}`);
filtered.slice(0, 3).forEach(t => {
  console.log(`  - ${t.key} (${t.language}): ${t.value}`);
});