import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import env from '../config/env.js';
import path from 'path';
import crypto from 'crypto';

// Initialize S3 client
const s3Client = new S3Client({
  region: env.awsRegion,
  credentials: {
    accessKeyId: env.awsAccessKeyId,
    secretAccessKey: env.awsSecretAccessKey,
  },
});

/**
 * Generate a unique filename
 */
export const generateFileName = (originalName) => {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${randomString}${ext}`;
};

/**
 * Upload file to S3
 */
export const uploadToS3 = async (file, folder = 'uploads') => {
  try {
    const fileName = generateFileName(file.originalname);
    const key = `${folder}/${fileName}`;

    const uploadParams = {
      Bucket: env.awsS3Bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
      // ACL removed - use bucket policy for public access instead
    };

    const upload = new Upload({
      client: s3Client,
      params: uploadParams,
    });

    await upload.done();

    // Return the public URL
    const fileUrl = `https://${env.awsS3Bucket}.s3.${env.awsRegion}.amazonaws.com/${key}`;
    return fileUrl;
  } catch (error) {
    console.error('S3 upload error:', error);
    console.error('Error details:', error.message);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

/**
 * Upload file buffer to S3
 */
export const uploadBufferToS3 = async (buffer, filename, mimetype, folder = 'uploads') => {
  try {
    const fileName = generateFileName(filename);
    const key = `${folder}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: env.awsS3Bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ACL: 'public-read',
      // ACL removed - use bucket policy for public access instead
    });

    await s3Client.send(command);

    const fileUrl = `https://${env.awsS3Bucket}.s3.${env.awsRegion}.amazonaws.com/${key}`;
    return fileUrl;
  } catch (error) {
    console.error('S3 buffer upload error:', error);
    console.error('Error details:', error.message);
    throw new Error(`Failed to upload buffer to S3: ${error.message}`);
  }
};

/**
 * Delete file from S3
 */
export const deleteFromS3 = async (fileUrl) => {
  try {
    // Extract key from URL
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove leading slash

    const command = new DeleteObjectCommand({
      Bucket: env.awsS3Bucket,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error('Failed to delete file from S3');
  }
};

/**
 * Get S3 file URL
 */
export const getS3FileUrl = (key) => {
  return `https://${env.awsS3Bucket}.s3.${env.awsRegion}.amazonaws.com/${key}`;
};
