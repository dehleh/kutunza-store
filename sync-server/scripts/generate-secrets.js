// Generate secure secrets for production
const crypto = require('crypto');

console.log('=================================');
console.log('  Production Secrets Generator');
console.log('=================================\n');

const apiKey = crypto.randomBytes(32).toString('hex');
const jwtSecret = crypto.randomBytes(64).toString('base64');

console.log('API_KEY:');
console.log(apiKey);
console.log('\nJWT_SECRET:');
console.log(jwtSecret);
console.log('\n=================================');
console.log('Copy these to your .env file!');
console.log('=================================');
