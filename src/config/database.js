import mongoose from 'mongoose';
import env from './env.js';

mongoose.set('strictQuery', true);

export const connectDatabase = async () => {
  try {
    await mongoose.connect(env.mongoUri, {
      autoIndex: env.nodeEnv !== 'production'
    });
    // eslint-disable-next-line no-console
    console.log('✅ MongoDB connected');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ MongoDB connection failed', error);
    process.exit(1);
  }
};
