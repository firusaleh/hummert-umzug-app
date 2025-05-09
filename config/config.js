// config/config.js
const dotenv = require('dotenv');
dotenv.config();

const config = {
  development: {
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/hummert-umzug',
    jwtSecret: process.env.JWT_SECRET || 'dev_secret',
    jwtExpire: process.env.JWT_EXPIRE || '30d',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    logLevel: 'debug'
  },
  production: {
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpire: process.env.JWT_EXPIRE || '30d',
    corsOrigin: process.env.CORS_ORIGIN,
    logLevel: 'error'
  }
};

const env = process.env.NODE_ENV || 'development';
module.exports = config[env];