import dotenv from 'dotenv';

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGODB_URI || 'mongodb+srv://devahari6465:l6MGWKtq303sbVv9@devahari6465.vok7c.mongodb.net/fixzep_test?retryWrites=true&w=majority&appName=devahari6465',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  timezone: process.env.TIMEZONE || 'Asia/Kolkata',
  adminTopic: process.env.ADMIN_NOTIFICATION_TOPIC || 'admin.notifications',
  technicianTopic: process.env.TECHNICIAN_NOTIFICATION_TOPIC || 'technician.notifications',
  defaultWorkingHours: {
    start: process.env.DEFAULT_WORKING_HOURS_START || '08:00',
    end: process.env.DEFAULT_WORKING_HOURS_END || '20:00'
  },
  // AWS S3 Configuration
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsS3Bucket: process.env.AWS_S3_BUCKET,
  // SMTP / email configuration
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM || 'no-reply@fixzep.com',
  // Public customer app URL used in email links
  customerAppUrl: process.env.CUSTOMER_APP_URL || 'https://eopsys.xyz/',
};

export default env;
