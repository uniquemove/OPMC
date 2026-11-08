import { Router } from 'express';
import { uploadImage } from '../config/cloudinary.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { query } from '../config/db.js';

const router = Router();

// Upload user avatar
router.post('/avatar', authenticateToken, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp dữ liệu ảnh base64' });
    }

    const uploadRes = await uploadImage(imageBase64, 'opm_avatars');
    if (!uploadRes.success) {
      return res.status(500).json({ success: false, message: 'Lỗi tải ảnh lên Cloudinary: ' + uploadRes.error });
    }

    // Cập nhật avatar_url trong database
    const userId = req.user.id;
    await query(`UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [uploadRes.url, userId]);

    return res.json({
      success: true,
      message: 'Cập nhật avatar anh hùng thành công!',
      avatarUrl: uploadRes.url,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi upload avatar: ' + error.message });
  }
});

export default router;
