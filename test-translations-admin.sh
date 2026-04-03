#!/bin/bash

echo "=== 测试翻译管理功能 ==="
echo ""

echo "1. 测试翻译API..."
TRANSLATIONS=$(curl -s http://localhost:3000/api/translations)
echo "获取到的翻译数据结构："
echo "$TRANSLATIONS" | jq 'keys'
echo ""

echo "2. 测试翻译数据转换..."
# 模拟前端的数据转换逻辑
cat > /tmp/test-convert.js << 'EOF'
const data = $TRANSLATIONS;
const translationsArray = [];
let idCounter = 1;

const processObject = (obj, prefix = '', language = '') => {
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    const fullKey = prefix ? \`\${prefix}.\${key}\` : key;
    
    if (typeof value === 'string' && value) {
      translationsArray.push({
        id: idCounter++,
        key: fullKey,
        language: language,
        value,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } else if (typeof value === 'object' && value !== null) {
      processObject(value, fullKey, language);
    }
  });
};

Object.keys(data).forEach(language => {
  const languageData = data[language];
  processObject(languageData, '', language);
});

console.log('转换后的翻译数量:', translationsArray.length);
console.log('前5个翻译:');
translationsArray.slice(0, 5).forEach(t => {
  console.log(\`  \${t.key} (\${t.language}): \${t.value}\`);
});

// 测试过滤功能
const search = 'filters';
const filtered = translationsArray.filter(t => 
  t.key.toLowerCase().includes(search.toLowerCase()) ||
  t.value.toLowerCase().includes(search.toLowerCase())
);
console.log(\`\n搜索"\${search}"的结果: \${filtered.length}\`);
filtered.slice(0, 3).forEach(t => {
  console.log(\`  - \${t.key} (\${t.language}): \${t.value}\`);
});
EOF

node /tmp/test-convert.js
echo ""

echo "3. 测试翻译管理页面访问..."
echo "访问翻译管理页面: http://localhost:3000/admin/translations"
echo ""

echo "=== 测试完成 ==="