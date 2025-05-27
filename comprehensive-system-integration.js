#!/usr/bin/env node

/**
 * Comprehensive System Integration Fix
 * 
 * This script fixes all connection issues between frontend and backend
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting Comprehensive System Integration...\n');

// 1. Create backend .env file
const backendEnvContent = `# Backend Environment Variables
NODE_ENV=development
PORT=5000

# Database
MONGO_URI=mongodb://localhost:27017/hummert-umzug
MONGO_URI_TEST=mongodb://localhost:27017/hummert-umzug-test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-this-in-production
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads
`;

// 2. Create frontend .env file
const frontendEnvContent = `# Frontend Environment Variables
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WEBSOCKET_URL=ws://localhost:5000
REACT_APP_ENV=development
`;

// 3. Fix backend auth controller to include refresh tokens
const authControllerFix = `// Add this to auth.controller.js login method
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'development_secret',
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'refresh_secret',
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  return { accessToken, refreshToken };
};

// In login method, replace token generation with:
const { accessToken, refreshToken } = generateTokens(user);

// Return both tokens
res.json({
  success: true,
  token: accessToken,
  refreshToken,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});
`;

// 4. Fix frontend API service token handling
const apiServiceFix = `// Update src/services/api.js

// Add refresh token logic
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Add response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      return new Promise((resolve, reject) => {
        api.post('/auth/refresh', { refreshToken })
          .then(({ data }) => {
            localStorage.setItem('token', data.token);
            localStorage.setItem('refreshToken', data.refreshToken);
            api.defaults.headers.common['Authorization'] = 'Bearer ' + data.token;
            processQueue(null, data.token);
            resolve(api(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);
`;

// 5. Add WebSocket support to backend
const websocketSetup = `// Add to server.js
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
});

// WebSocket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.userId);
  
  socket.join(\`user:\${socket.userId}\`);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
  });
});

// Export io for use in controllers
app.set('io', io);

// Change app.listen to server.listen
server.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;

// 6. Fix frontend websocket service
const websocketServiceFix = `// Update src/services/websocket.js
import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.socket = io(process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:5000', {
      auth: {
        token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Re-attach all listeners
    this.listeners.forEach((callback, event) => {
      this.socket.on(event, callback);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    this.listeners.set(event, callback);
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event) {
    this.listeners.delete(event);
    if (this.socket) {
      this.socket.off(event);
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }
}

export default new WebSocketService();
`;

// 7. Create comprehensive test script
const integrationTest = `const axios = require('axios');
const io = require('socket.io-client');

const API_URL = 'http://localhost:5000/api';
const WS_URL = 'http://localhost:5000';

async function testIntegration() {
  console.log('🧪 Testing System Integration...\n');

  try {
    // 1. Test Authentication
    console.log('1. Testing Authentication...');
    const authRes = await axios.post(\`\${API_URL}/auth/login\`, {
      email: 'admin@hummert.de',
      password: 'admin123'
    });
    
    const { token, refreshToken } = authRes.data;
    console.log('✅ Login successful');
    console.log('✅ Access token received');
    console.log(\`✅ Refresh token received: \${!!refreshToken}\`);

    // 2. Test Protected Routes
    console.log('\\n2. Testing Protected Routes...');
    const config = { headers: { Authorization: \`Bearer \${token}\` } };
    
    const endpoints = [
      '/umzuege',
      '/mitarbeiter',
      '/fahrzeuge',
      '/aufnahmen',
      '/finanzen/angebote'
    ];

    for (const endpoint of endpoints) {
      try {
        await axios.get(\`\${API_URL}\${endpoint}\`, config);
        console.log(\`✅ \${endpoint} - OK\`);
      } catch (error) {
        console.log(\`❌ \${endpoint} - Failed: \${error.response?.status}\`);
      }
    }

    // 3. Test WebSocket Connection
    console.log('\\n3. Testing WebSocket...');
    const socket = io(WS_URL, {
      auth: { token }
    });

    await new Promise((resolve, reject) => {
      socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        resolve();
      });
      socket.on('connect_error', (error) => {
        console.log('❌ WebSocket failed:', error.message);
        reject(error);
      });
      setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
    }).catch(() => {});

    socket.disconnect();

    // 4. Test Token Refresh
    console.log('\\n4. Testing Token Refresh...');
    try {
      const refreshRes = await axios.post(\`\${API_URL}/auth/refresh\`, {
        refreshToken
      });
      console.log('✅ Token refresh successful');
    } catch (error) {
      console.log('❌ Token refresh failed');
    }

    console.log('\\n✅ Integration test completed!');
    
  } catch (error) {
    console.error('\\n❌ Integration test failed:', error.message);
  }
}

testIntegration();
`;

// Write all files
console.log('📝 Creating configuration files...\n');

// Backend .env
if (!fs.existsSync(path.join(__dirname, 'backend', '.env'))) {
  fs.writeFileSync(path.join(__dirname, 'backend', '.env'), backendEnvContent);
  console.log('✅ Created backend/.env');
} else {
  console.log('⚠️  backend/.env already exists - skipping');
}

// Frontend .env
if (!fs.existsSync(path.join(__dirname, 'frontend', '.env'))) {
  fs.writeFileSync(path.join(__dirname, 'frontend', '.env'), frontendEnvContent);
  console.log('✅ Created frontend/.env');
} else {
  console.log('⚠️  frontend/.env already exists - skipping');
}

// Create fix documentation
const fixDocumentation = `# Comprehensive System Integration Fixes

## Changes Required:

### 1. Backend Authentication (/backend/controllers/auth.controller.js)
${authControllerFix}

### 2. Add Refresh Token Route (/backend/routes/auth.routes.js)
\`\`\`javascript
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    
    res.json({
      token: accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});
\`\`\`

### 3. Frontend API Service (/frontend/src/services/api.js)
${apiServiceFix}

### 4. Backend WebSocket Setup (/backend/server.js)
${websocketSetup}

### 5. Frontend WebSocket Service (/frontend/src/services/websocket.js)
${websocketServiceFix}

### 6. Install Required Dependencies

Backend:
\`\`\`bash
cd backend
npm install socket.io jsonwebtoken
\`\`\`

Frontend:
\`\`\`bash
cd frontend
npm install socket.io-client
\`\`\`

## Testing

Run the integration test:
\`\`\`bash
node test-system-integration.js
\`\`\`

## Environment Variables

Make sure both .env files are properly configured with your specific values.
`;

fs.writeFileSync(path.join(__dirname, 'SYSTEM_INTEGRATION_FIXES.md'), fixDocumentation);
console.log('✅ Created SYSTEM_INTEGRATION_FIXES.md');

// Create test script
fs.writeFileSync(path.join(__dirname, 'test-system-integration.js'), integrationTest);
console.log('✅ Created test-system-integration.js');

console.log('\n🎉 System integration setup complete!');
console.log('\nNext steps:');
console.log('1. Review and apply the changes in SYSTEM_INTEGRATION_FIXES.md');
console.log('2. Install required dependencies in both frontend and backend');
console.log('3. Update environment variables in .env files');
console.log('4. Restart both servers');
console.log('5. Run: node test-system-integration.js');