import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('🚀 Đang kết nối tới Neon PostgreSQL để chạy migration...');
  const client = await pool.connect();
  try {
    const schemaPath = path.join(__dirname, '../models/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Đang thực thi schema.sql...');
    await client.query(sql);

    // Kiểm tra các bảng đã tạo
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('✅ Migration thành công! Danh sách các bảng trong database:');
    res.rows.forEach(r => console.log(`   - ${r.table_name}`));

    // Kiểm tra số lượng cấp độ challenge đã seed
    const levelsRes = await client.query('SELECT count(*) as total_levels FROM challenge_levels;');
    console.log(`🏆 Tổng số cấp độ thử thách đã khởi tạo: ${levelsRes.rows[0].total_levels} cấp độ.`);

  } catch (error) {
    console.error('❌ Lỗi khi chạy migration:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
