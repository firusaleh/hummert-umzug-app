# Backend Deployment Guide

This guide provides instructions for deploying the Hummert Umzug backend application as a standalone service.

## Prerequisites

- Node.js 18.x or higher
- MongoDB instance (local or cloud-based like MongoDB Atlas)
- Docker (optional, for containerized deployment)
- PM2 (optional, for process management)

## Deployment Options

### Option 1: Direct Node.js Deployment

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hummert-umzug-app/backend
   ```

2. **Install dependencies**
   ```bash
   npm ci --production
   ```

3. **Configure environment**
   ```bash
   cp .env.production .env
   # Edit .env with your production values
   ```

4. **Start the server**
   ```bash
   npm start
   ```

### Option 2: PM2 Deployment (Recommended for VPS)

1. **Install PM2 globally**
   ```bash
   npm install -g pm2
   ```

2. **Start with PM2**
   ```bash
   npm run start:pm2
   ```

3. **Save PM2 configuration**
   ```bash
   pm2 save
   pm2 startup
   ```

4. **Monitor the application**
   ```bash
   pm2 monit
   npm run logs:pm2
   ```

### Option 3: Docker Deployment

1. **Build the Docker image**
   ```bash
   npm run docker:build
   ```

2. **Run with Docker**
   ```bash
   npm run docker:run
   ```

3. **Or use Docker Compose**
   ```bash
   npm run docker:compose
   ```

### Option 4: Platform-Specific Deployments

#### Heroku
```bash
# Install Heroku CLI
# Create Heroku app
heroku create hummert-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=<your-mongodb-uri>
heroku config:set JWT_SECRET=<your-jwt-secret>
# ... set other environment variables

# Deploy
git push heroku main
```

#### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and initialize
railway login
railway init

# Deploy
railway up
```

#### Render
1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Deploy automatically on push

## Environment Variables

Required environment variables:

```env
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
JWT_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<another-strong-secret>

# Server
PORT=5000
NODE_ENV=production

# Security
ALLOWED_ORIGINS=https://www.lagerlogix.de

# Email (if using email features)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email>
SMTP_PASS=<app-password>
```

## Health Check

The backend provides a health check endpoint at:
```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T10:00:00.000Z",
  "service": "hummert-umzug-api"
}
```

## Security Checklist

- [ ] Strong JWT secrets (use `openssl rand -base64 64`)
- [ ] HTTPS enabled (use reverse proxy like Nginx)
- [ ] CORS configured for production domain only
- [ ] Rate limiting enabled
- [ ] MongoDB connection uses SSL
- [ ] Environment variables secured
- [ ] No sensitive data in logs
- [ ] Regular security updates

## Monitoring

### Logs
- Application logs: `./logs/app.log`
- PM2 logs: `npm run logs:pm2`
- Docker logs: `docker logs <container-id>`

### Performance
- Monitor memory usage
- Track response times
- Set up alerts for errors

## Backup

### Database Backup
```bash
# MongoDB Atlas provides automated backups
# For self-hosted MongoDB:
mongodump --uri="<mongodb-uri>" --out=./backup
```

### File Uploads
Ensure `/uploads` directory is backed up regularly

## Troubleshooting

### Port Already in Use
```bash
lsof -i :5000
kill -9 <PID>
```

### MongoDB Connection Issues
- Check MongoDB URI format
- Verify network access (IP whitelist)
- Check credentials

### Memory Issues
- Increase Node.js memory: `--max-old-space-size=8192`
- Use PM2 cluster mode for load balancing

## Scaling

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Optimize Node.js memory usage

### Horizontal Scaling
- Use PM2 cluster mode: `instances: 'max'`
- Deploy multiple instances behind load balancer
- Use MongoDB replica sets

## Maintenance

### Updates
```bash
# Backup first!
git pull origin main
npm ci --production
npm run restart:pm2  # or restart your deployment
```

### Database Migrations
```bash
# Run any migration scripts
node migrations/migrate.js
```

## Support

For deployment issues:
1. Check logs for errors
2. Verify environment variables
3. Test health endpoint
4. Check MongoDB connection
5. Review security settings