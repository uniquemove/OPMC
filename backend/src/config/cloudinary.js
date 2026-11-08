import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dqi97nvvw',
  api_key: process.env.CLOUDINARY_API_KEY || '114291396565599',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'uegBtxB5gk1qhsHsLYEAxmUPFz0',
  secure: true,
});

export const uploadImage = async (fileBase64, folder = 'opm_challenge') => {
  try {
    const uploadRes = await cloudinary.uploader.upload(fileBase64, {
      folder: folder,
      resource_type: 'auto',
    });
    return {
      success: true,
      url: uploadRes.secure_url,
      public_id: uploadRes.public_id,
    };
  } catch (error) {
    console.error('[Cloudinary Upload Error]', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default cloudinary;
