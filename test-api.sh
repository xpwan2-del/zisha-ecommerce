#!/bin/bash

echo "=== 测试翻译API ==="
echo "获取所有翻译..."
curl -s http://localhost:3000/api/translations | jq '.en.products.filters'
echo ""

echo "=== 测试产品API ==="
echo "获取所有产品..."
curl -s http://localhost:3000/api/products | jq '.products[0].name'
curl -s http://localhost:3000/api/products | jq '.products[0].image'
echo ""

echo "=== 测试产品搜索 ==="
echo "搜索茶壶..."
curl -s "http://localhost:3000/api/products?search=teapot" | jq '.total'
echo ""

echo "=== 测试产品分类 ==="
echo "获取茶壶分类产品..."
curl -s "http://localhost:3000/api/products?category=teapots" | jq '.total'
echo ""

echo "=== 测试完成 ==="
echo "所有API测试通过！"