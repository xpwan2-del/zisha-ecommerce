import sqlite3
import os

DB_PATH = 'src/lib/db/database.sqlite'

TRANSLATIONS = {
    '紫砂壶': {'en': 'Zisha Teapot', 'ar': 'إبوة زيشا'},
    '紫砂茶杯': {'en': 'Zisha Tea Cup', 'ar': 'فنجان شاي زيشا'},
    '紫砂茶叶罐': {'en': 'Zisha Tea Caddy', 'ar': 'وعاء شاي زيشا'},
    '紫砂茶具': {'en': 'Zisha Tea Set', 'ar': 'مجموعة شاي زيشا'},
    '紫砂': {'en': 'Zisha', 'ar': 'زيشا'},
    '茶具套装': {'en': 'Tea Set', 'ar': 'مجموعة شاي'},
    '套装': {'en': 'Set', 'ar': 'مجموعة'},
    '功夫茶具': {'en': 'Gongfu Tea Set', 'ar': 'مجموعة شاي قونفو'},
    '功夫茶': {'en': 'Gongfu Tea', 'ar': 'شاي قونفو'},
    '茶叶罐': {'en': 'Tea Caddy', 'ar': 'وعاء شاي'},
    '茶盘': {'en': 'Tea Tray', 'ar': 'صينية شاي'},
    '茶宠': {'en': 'Tea Pet', 'ar': 'رفيق الشاي'},
    '茶漏': {'en': 'Tea Filter', 'ar': 'مصفاة الشاي'},
    '茶夹': {'en': 'Tea Tweezers', 'ar': 'ملقط الشاي'},
    '茶匙': {'en': 'Tea Spoon', 'ar': 'ملعق الشاي'},
    '茶漏托架': {'en': 'Tea Filter Stand', 'ar': 'حامل مصفاة الشاي'},
    '一壶两杯': {'en': '1 Pot 2 Cups', 'ar': 'إبوة وكأسين'},
    '一壶四杯': {'en': '1 Pot 4 Cups', 'ar': 'إبوة وأربعة أكواب'},
    '茶具': {'en': 'Tea Set', 'ar': 'مجموعة شاي'},
    '茶杯': {'en': 'Tea Cup', 'ar': 'فنجان شاي'},
    '茶壶': {'en': 'Teapot', 'ar': 'إبوة شاي'},
    '石瓢': {'en': 'Shipiao', 'ar': 'شيبياو'},
    '西施': {'en': 'Xishi', 'ar': 'شي شي'},
    '仿古': {'en': 'Fangu', 'ar': 'فانغو'},
    '掇球': {'en': 'Duoqiu', 'ar': 'دوتشيو'},
    '秦权': {'en': 'Quan', 'ar': 'تشوان'},
    '水平': {'en': 'Shuiping', 'ar': 'شويبينغ'},
    '潘壶': {'en': 'Pan', 'ar': 'بان'},
    '鱼化龙': {'en': 'Yuhualong', 'ar': 'يوهوالونغ'},
    '松竹梅': {'en': 'Songzhu Mei', 'ar': 'سونغ تشو مي'},
    '菊瓣': {'en': 'Juban', 'ar': 'جوبان'},
    '竹节': {'en': 'Zhujie', 'ar': 'تشوجيه'},
    '海棠': {'en': 'Haitang', 'ar': 'هايتانغ'},
    '瓜棱': {'en': 'Gualeng', 'ar': 'جوالينغ'},
    '扁壶': {'en': 'Bianhu', 'ar': 'بيانهو'},
    '圆口': {'en': 'Yuankou', 'ar': 'يوانكو'},
    '撇口': {'en': 'Piaokou', 'ar': 'بياو كو'},
    '直口': {'en': 'Zhikou', 'ar': 'تشي كو'},
    '花口': {'en': 'Huakou', 'ar': 'هوا كو'},
    '八方': {'en': 'Bafang', 'ar': 'بافانغ'},
    '斗笠': {'en': 'Douli', 'ar': 'دولي'},
    '铃铛': {'en': 'Lingdang', 'ar': 'لينغ دينغ'},
    '鸡心': {'en': 'Jixin', 'ar': 'جي شين'},
    '圆底': {'en': 'Yuandi', 'ar': 'يوان دي'},
    '汉铎': {'en': 'Handuo', 'ar': 'هاندوو'},
    '容天': {'en': 'Rongtian', 'ar': 'رونغ تيان'},
    '子冶石瓢': {'en': 'Ziye Shipiao', 'ar': 'زييه شيبياو'},
    '景舟石瓢': {'en': 'Jingzhou Shipiao', 'ar': 'جينغ تشو شيبياو'},
    '匏尊': {'en': 'Paozun', 'ar': 'باو زون'},
    '思亭': {'en': 'Siting', 'ar': 'سيتينغ'},
    '圆筒': {'en': 'Yuantong', 'ar': 'يوان تونغ'},
    '方形': {'en': 'Fangxing', 'ar': 'فانغ شينغ'},
    '南瓜': {'en': 'Nangua', 'ar': 'نانغوا'},
    '葫芦': {'en': 'Hulu', 'ar': 'هولو'},
    '鼓形': {'en': 'Guxing', 'ar': 'غو شينغ'},
    '限量': {'en': 'Limited', 'ar': 'محدود'},
    '尊享': {'en': 'Premium', 'ar': 'متميز'},
    '收藏': {'en': 'Collection', 'ar': 'مجموعة'},
    '精品': {'en': 'Premium', 'ar': 'ممتاز'},
    '传统': {'en': 'Traditional', 'ar': 'تقليدي'},
    '现代': {'en': 'Modern', 'ar': 'عصري'},
    '定制': {'en': 'Custom', 'ar': 'مخصص'},
    '入门': {'en': 'Beginner', 'ar': 'مبتدئ'},
    '大师': {'en': 'Master', 'ar': 'أستاذ'},
    '礼品': {'en': 'Gift', 'ar': 'هدية'},
    '旅行': {'en': 'Travel', 'ar': 'سفر'},
    '紫砂茶漏': {'en': 'Zisha Tea Filter', 'ar': 'مصفاة شاي زيشا'},
    '紫砂茶宠-貔貅': {'en': 'Zisha Tea Pet - Pixiu', 'ar': 'رفيق شاي زيشا - بي شيو'},
}

def translate_text(text, target='en'):
    result = text
    for cn, trans in TRANSLATIONS.items():
        if cn in result:
            if target == 'en':
                replacement = trans['en']
            else:
                replacement = trans['ar']
            result = result.replace(cn, replacement)
    return result

def translate_name(name, target='en'):
    import re
    
    match = re.match(r'^(\d+\.\s*)', name)
    prefix = match.group(1) if match else ''
    rest = name[len(prefix):]
    
    sorted_trans = sorted(TRANSLATIONS.items(), key=lambda x: len(x[0]), reverse=True)
    
    result = rest
    for cn, trans in sorted_trans:
        if cn in result:
            if target == 'en':
                replacement = trans['en']
            else:
                replacement = trans['ar']
            result = result.replace(cn, ' ' + replacement + ' ')
    
    result = result.strip()
    result = ' '.join(result.split())
    
    if target == 'en':
        result = result + ' (Zisha)'
    else:
        if 'زيشا' not in result:
            result = 'إبوة زيشا ' + result
    
    return prefix + result

def generate_description(name, target='en'):
    if target == 'en':
        return f"Crafted from authentic Yixing original Zisha clay, this {translate_name(name, 'en')} is meticulously handmade. Its unique shape and elegant lines showcase natural kiln transformation with a warm, lustrous color. When brewing tea, it enhances the aroma and provides a lingering aftertaste, making it a prized collection for tea enthusiasts. Comes with a professional certificate and luxury gift box."
    else:
        return f"مصنوع من الطين الأصلي الزيشا الأصيل من ييكسينغ، هذا {translate_name(name, 'ar')} مصنوع يدوياً بعناية. شكله الفريد وخطوطه الأنيقة تُظهر تحول طبيعي في الفرن بلون دافئ ولامع. عند تحضير الشاي، يُعزز الرائحة ويوفر طعماً طويلاً، مما يجعله كنزاً محبوباً لعشاق الشاي. يأتي مع شهادة احترافية وهدية فاخرة."

def update_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name, name_en, name_ar, description, description_en, description_ar FROM products")
    products = cursor.fetchall()
    
    updated = 0
    for p in products:
        pid, name, name_en, name_ar, desc, desc_en, desc_ar = p
        
        new_name_en = translate_name(name, 'en')
        new_name_ar = translate_name(name, 'ar')
        new_desc_en = generate_description(name, 'en')
        new_desc_ar = generate_description(name, 'ar')
        
        cursor.execute("""
            UPDATE products 
            SET name_en = ?, name_ar = ?, description_en = ?, description_ar = ?
            WHERE id = ?
        """, (new_name_en, new_name_ar, new_desc_en, new_desc_ar, pid))
        
        updated += 1
        print(f"Updated product {pid}: {name[:20]}...")
    
    conn.commit()
    conn.close()
    print(f"\nTotal updated: {updated} products")

if __name__ == '__main__':
    update_database()