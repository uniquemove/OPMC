import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin: username, email, password' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (username, email, password_hash, hero_rank, level) 
       VALUES ($1, $2, $3, 'Hero C', 1) 
       RETURNING id, username, email, hero_rank, level, current_streak, created_at`,
      [username, email, passwordHash]
    );

    const newUser = result.rows[0];
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      process.env.JWT_SECRET || 'super_secret_one_punch_man_key_2026',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản anh hùng thành công!',
      user: newUser,
      token,
    });
  } catch (error) {
    if (error.code === '23505') { // unique violation in pg
      return res.status(409).json({ success: false, message: 'Username hoặc Email đã tồn tại trong hệ thống' });
    }
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng ký: ' + error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập/email và mật khẩu' });
    }

    const result = await query(
      `SELECT * FROM users WHERE username = $1 OR email = $1 LIMIT 1`,
      [usernameOrEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'super_secret_one_punch_man_key_2026',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    delete user.password_hash;
    return res.json({
      success: true,
      message: 'Đăng nhập thành công! Chào mừng anh hùng trở lại.',
      user,
      token,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi đăng nhập: ' + error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query(
      `SELECT id, username, email, hero_rank, level, current_streak, max_streak, avatar_url, created_at 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    return res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy thông tin cá nhân: ' + error.message });
  }
};
