// PM2 Configuration for Production Deployment
module.exports = {
  apps: [{
    name: 'hummert-backend',
    script: './server.js',
    instances: 'max', // Use all available CPU cores
    exec_mode: 'cluster',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    
    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    
    // Advanced features
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 5000,
    
    // Auto restart
    autorestart: true,
    max_restarts: 10,
    min_uptime: '30s',
    
    // Node.js arguments
    node_args: '--max-old-space-size=8192',
    
    // Environment specific settings
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    
    // Monitoring
    monitoring: true,
    
    // Source map support
    source_map_support: true,
    
    // Cluster mode settings
    instance_var: 'INSTANCE_ID',
    
    // Health check
    health_check: {
      interval: 30000,
      timeout: 5000,
      max_consecutive_failures: 3
    }
  }],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/hummert-umzug-app.git',
      path: '/var/www/hummert-backend',
      'post-deploy': 'cd backend && npm ci --production && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying backend to production server"'
    }
  }
};