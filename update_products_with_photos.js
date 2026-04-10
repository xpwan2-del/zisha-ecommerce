const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 桌面照片文件夹路径
const desktopPhotosPath = path.join(process.env.HOME, 'Desktop', '产品照片');
// 项目图片目录
const projectImagesPath = path.join(__dirname, 'public', 'images', 'products');
// 数据库路径
const dbPath = path.join(__dirname, 'src', 'lib', 'db', 'database.sqlite');

// 读取照片信息
function readPhotosInfo() {
  const photos = fs.readdirSync(desktopPhotosPath);
  const products = {};
  
  photos.forEach(photo => {
    if (photo.endsWith('.jpg')) {
      const parts = photo.split('_');
      if (parts.length >= 3) {
        const productId = parts[0];
        const photoNumber = parts[parts.length - 1].replace('.jpg', '');
        // 提取商品名称（去掉产品序号和照片序号）
        const productNameParts = parts.slice(1, parts.length - 1);
        const productName = productNameParts.join('_');
        
        if (!products[productId]) {
          products[productId] = {
            id: parseInt(productId),
            name: productName,
            photos: []
          };
        }
        
        products[productId].photos.push(photo);
      }
    }
  });
  
  // 按产品ID排序
  return Object.values(products).sort((a, b) => a.id - b.id);
}

// 复制照片到项目目录
function copyPhotosToProject(products) {
  products.forEach(product => {
    product.photos.forEach(photo => {
      const sourcePath = path.join(desktopPhotosPath, photo);
      const targetPath = path.join(projectImagesPath, photo);
      
      // 复制文件
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`复制照片: ${photo}`);
    });
  });
}

// 更新数据库
function updateDatabase(products) {
  const db = new sqlite3.Database(dbPath);
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      let completed = 0;
      const total = products.length;
      
      products.forEach((product, index) => {
        // 排序照片，确保按1-6的顺序
        const sortedPhotos = product.photos.sort((a, b) => {
          const aNum = parseInt(a.split('_').pop().replace('.jpg', ''));
          const bNum = parseInt(b.split('_').pop().replace('.jpg', ''));
          return aNum - bNum;
        });
        
        // 构建图片路径数组
        const imagePaths = sortedPhotos.map(photo => `/images/products/${photo}`);
        const mainImage = imagePaths[0];
        const imagesJson = JSON.stringify(imagePaths);
        
        // 构建产品名称（添加序号）
        const formattedName = `${product.id}. ${product.name}`;
        
        // 更新数据库
        const sql = `UPDATE products SET name = ?, image = ?, images = ? WHERE id = ?`;
        db.run(sql, [formattedName, mainImage, imagesJson, index + 5], function(err) {
          if (err) {
            reject(err);
          } else {
            completed++;
            console.log(`更新产品: ${formattedName} (ID: ${index + 5})`);
            
            if (completed === total) {
              resolve({ updated: completed });
            }
          }
        });
      });
    });
  });
}

// 主函数
async function main() {
  try {
    console.log('开始更新产品信息...');
    
    // 读取照片信息
    const products = readPhotosInfo();
    console.log(`找到 ${products.length} 个产品`);
    
    // 复制照片到项目目录
    console.log('\n复制照片到项目目录...');
    copyPhotosToProject(products);
    
    // 更新数据库
    console.log('\n更新数据库...');
    const result = await updateDatabase(products);
    console.log(`\n更新完成，成功更新 ${result.updated} 个产品`);
    
  } catch (error) {
    console.error('错误:', error);
  }
}

// 运行主函数
main();
