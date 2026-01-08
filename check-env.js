import env from './src/config/env.js';

console.log('Environment Configuration Check:');
console.log('================================');
console.log('AWS_REGION:', env.awsRegion);
console.log('AWS_ACCESS_KEY_ID:', env.awsAccessKeyId ? '***' + env.awsAccessKeyId.slice(-4) : 'NOT SET');
console.log('AWS_SECRET_ACCESS_KEY:', env.awsSecretAccessKey ? '***' + env.awsSecretAccessKey.slice(-4) : 'NOT SET');
console.log('AWS_S3_BUCKET:', env.awsS3Bucket);
console.log('================================');

if (!env.awsAccessKeyId || !env.awsSecretAccessKey || !env.awsS3Bucket) {
  console.error('⚠️  AWS credentials are not properly configured!');
  console.error('Please check your .env file and ensure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET are set.');
  process.exit(1);
} else {
  console.log('✓ AWS credentials are configured');
}
