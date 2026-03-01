require('dotenv').config();

/**
 * Config tập trung — load từ .env
 */
module.exports = {
  port: parseInt(process.env.PORT, 10) || 3001,
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  fb: {
    appId: process.env.FB_APP_ID || '',
    appSecret: process.env.FB_APP_SECRET || '',
    verifyToken: process.env.FB_VERIFY_TOKEN || 'hoangnam_verify_2024',
    pageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN || '',
    graphApiUrl: 'https://graph.facebook.com/v18.0',
  },
};
