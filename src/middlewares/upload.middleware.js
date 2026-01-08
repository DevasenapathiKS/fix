import multer from 'multer';
import path from 'path';
import { uploadToS3 } from '../utils/s3.js';

// Use memory storage to store files in memory as Buffer
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpg, png, gif, webp)'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * Upload file to S3 and return the URL
 */
export const uploadFileToS3 = async (file, folder = 'banners') => {
  try {
    const fileUrl = await uploadToS3(file, folder);
    return fileUrl;
  } catch (error) {
    throw new Error('Failed to upload file to S3: ' + error.message);
  }
};
