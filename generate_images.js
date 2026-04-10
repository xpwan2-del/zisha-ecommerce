const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 产品信息文件路径
const productsInfoPath = path.join(__dirname, 'products_info.txt');
// 图片存储路径
const imagesOutputPath = path.join(__dirname, 'generated_images');
// 项目图片目录
const projectImagesPath = path.join(__dirname, 'public', 'images', 'products');
// 数据库路径
const dbPath = path.join(__dirname, 'src', 'lib', 'db', 'database.sqlite');

// 读取产品信息
function readProductsInfo() {
  const content = fs.readFileSync(productsInfoPath, 'utf8');
  const lines = content.trim().split('\n');
  const products = [];
  
  lines.forEach(line => {
    const parts = line.split('|');
    if (parts.length >= 4) {
      const [id, name, image, images] = parts;
      products.push({
        id: parseInt(id),
        name: name.trim(),
        image: image.trim(),
        images: JSON.parse(images.trim())
      });
    }
  });
  
  return products;
}

// 生成AI图片的函数
async function generateImage(prompt, outputPath) {
  console.log(`生成图片: ${prompt}`);
  console.log(`保存到: ${outputPath}`);
  
  // 使用Trae的内置图片生成API
  const imageUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=square_hd`;
  
  // 下载图片
  const https = require('https');
  const fs = require('fs');
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(imageUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath);
      reject(err);
    });
  });
}

// 生成产品图片
async function generateProductImages(product) {
  const productId = product.id;
  const productName = product.name;
  const baseFilename = `${productId}_${productName.replace(/\s+/g, '_').replace(/\./g, '')}`;
  
  const prompts = [
    `紫砂 ${productName} 正面展示 高清 白色背景`,
    `紫砂 ${productName} 侧面展示 高清 白色背景`,
    `紫砂 ${productName} 顶部展示 高清 白色背景`,
    `紫砂 ${productName} 底部展示 高清 白色背景`,
    `紫砂 ${productName} 细节特写 高清 白色背景`,
    `紫砂 ${productName} 使用场景 高清 茶室背景`
  ];
  
  const imagePaths = [];
  
  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    const filename = `${baseFilename}_${i + 1}.jpg`;
    const outputPath = path.join(imagesOutputPath, filename);
    const projectPath = `/images/products/${filename}`;
    
    // 生成图片
    await generateImage(prompt, outputPath);
    
    // 复制到项目目录
    const projectOutputPath = path.join(projectImagesPath, filename);
    // 复制生成的图片到项目目录
    fs.copyFileSync(outputPath, projectOutputPath);
    console.log(`复制到项目目录: ${projectOutputPath}`);
    
    imagePaths.push(projectPath);
  }
  
  return imagePaths;
}

// 更新数据库
function updateDatabase(productId, imagePath, imagePaths) {
  const db = new sqlite3.Database(dbPath);
  
  return new Promise((resolve, reject) => {
    const imagesJson = JSON.stringify(imagePaths);
    const sql = `UPDATE products SET image = ?, images = ? WHERE id = ?`;
    
    db.run(sql, [imagePath, imagesJson, productId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
      db.close();
    });
  });
}

// 主函数
async function main() {
  try {
    console.log('开始生成产品图片...');
    
    // 创建生成图片目录
    if (!fs.existsSync(imagesOutputPath)) {
      fs.mkdirSync(imagesOutputPath, { recursive: true });
    }
    
    // 复制产品信息文件到项目目录
    const desktopProductsInfoPath = path.join(process.env.HOME, 'Desktop', '照片在这里', 'products_info.txt');
    if (fs.existsSync(desktopProductsInfoPath)) {
      fs.copyFileSync(desktopProductsInfoPath, productsInfoPath);
    }
    
    // 读取产品信息
    const products = readProductsInfo();
    console.log(`找到 ${products.length} 个产品`);
    
    // 为前5个产品生成图片并更新数据库（测试用）
    const testProducts = products.slice(0, 5);
    for (const product of testProducts) {
      console.log(`\n处理产品: ${product.name} (ID: ${product.id})`);
      
      // 生成图片
      const imagePaths = await generateProductImages(product);
      
      // 更新数据库
      await updateDatabase(product.id, imagePaths[0], imagePaths);
      console.log(`更新成功: ${product.name}`);
    }
    
    console.log(`\n测试完成，已处理 ${testProducts.length} 个产品`);
    
    console.log('\n所有产品图片生成和更新完成！');
    
  } catch (error) {
    console.error('错误:', error);
  }
}

// 运行主函数
main();
