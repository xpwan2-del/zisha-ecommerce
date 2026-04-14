const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// 连接数据库
const db = new sqlite3.Database('./src/lib/db/database.sqlite');

// 读取所有用户
db.all('SELECT id, email, password FROM users', (err, rows) => {
  if (err) {
    console.error('Error reading users:', err);
    db.close();
    return;
  }

  console.log(`Found ${rows.length} users`);
  let updatedCount = 0;

  rows.forEach(user => {
    // 检查密码是否已经是哈希值（bcrypt 哈希值长度通常为 60 或更长）
    if (user.password.length < 60 || !user.password.startsWith('$2a$')) {
      console.log(`Updating password for user: ${user.email}`);
      
      // 哈希密码
      bcrypt.hash(user.password, 10, (err, hashedPassword) => {
        if (err) {
          console.error(`Error hashing password for user ${user.email}:`, err);
          return;
        }

        // 更新数据库
        db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id], (err) => {
          if (err) {
            console.error(`Error updating password for user ${user.email}:`, err);
          } else {
            console.log(`Updated password for user: ${user.email}`);
            updatedCount++;

            // 检查是否所有用户都已处理
            if (updatedCount === rows.filter(u => u.password.length < 60 || !u.password.startsWith('$2a$')).length) {
              console.log(`\nUpdated ${updatedCount} users`);
              db.close();
            }
          }
        });
      });
    } else {
      console.log(`Password for user ${user.email} is already hashed`);
    }
  });
});
