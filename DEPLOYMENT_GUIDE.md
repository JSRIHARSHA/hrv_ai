# 🚀 Application Deployment Guide

This guide provides multiple options to deploy your Order Management Application so others can access it from different networks.

## 📋 Prerequisites

- Node.js (v14 or higher)
- Python 3.7+ with pip
- Git (for version control)

## 🎯 Deployment Options

### Option 1: Local Network Deployment (Easiest)

Perfect for testing with colleagues on the same network or VPN.

#### Steps:

1. **Configure Server for External Access**
   ```bash
   # Update server.js to listen on all interfaces
   # Change line 202 from:
   app.listen(PORT, () => {
   # To:
   app.listen(PORT, '0.0.0.0', () => {
   ```

2. **Find Your IP Address**
   ```bash
   # Windows
   ipconfig
   
   # macOS/Linux
   ifconfig
   # or
   ip addr show
   ```

3. **Update Frontend Configuration**
   ```bash
   # In your React app, update API base URL to use your IP
   # Look for files that make API calls and update localhost to your IP
   ```

4. **Start the Application**
   ```bash
   # Terminal 1: Start Backend
   node server.js
   
   # Terminal 2: Start Frontend
   npm start
   ```

5. **Share Access**
   - Frontend: `http://YOUR_IP:3000`
   - Backend API: `http://YOUR_IP:3001`

#### Firewall Configuration (Windows)
```powershell
# Allow Node.js through Windows Firewall
New-NetFirewallRule -DisplayName "Node.js Backend" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
New-NetFirewallRule -DisplayName "Node.js Frontend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

### Option 2: Cloud Deployment (Recommended for External Users)

#### A. Deploy to Heroku (Free Tier Available)

1. **Prepare for Heroku**
   ```bash
   # Install Heroku CLI
   # Download from: https://devcenter.heroku.com/articles/heroku-cli
   
   # Login to Heroku
   heroku login
   ```

2. **Create Heroku App**
   ```bash
   # Create new app
   heroku create your-app-name
   
   # Set environment variables
   heroku config:set NODE_ENV=production
   heroku config:set PYTHON_VERSION=3.9.0
   ```

3. **Configure for Heroku**
   ```bash
   # Create Procfile in root directory
   echo "web: node server.js" > Procfile
   
   # Create runtime.txt for Python version
   echo "python-3.9.0" > runtime.txt
   ```

4. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

#### B. Deploy to Railway (Modern Alternative)

1. **Connect to Railway**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login
   railway login
   ```

2. **Deploy**
   ```bash
   # Initialize project
   railway init
   
   # Deploy
   railway up
   ```

#### C. Deploy to Vercel (Frontend) + Railway (Backend)

**Frontend (Vercel):**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy frontend
vercel --prod
```

**Backend (Railway):**
```bash
# Deploy backend separately
railway init
railway up
```

### Option 3: Docker Deployment

Perfect for consistent deployment across different environments.

#### Create Dockerfile
```dockerfile
# Multi-stage build for React + Node.js + Python
FROM node:16-alpine AS frontend-build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Backend stage
FROM node:16-alpine

# Install Python and dependencies
RUN apk add --no-cache python3 py3-pip

WORKDIR /app

# Copy backend files
COPY backend-package.json package.json
COPY server.js ./
COPY universal_pdf_extractor.py ./
COPY requirements.txt ./

# Install Node.js dependencies
RUN npm install

# Install Python dependencies
RUN pip3 install -r requirements.txt

# Copy built frontend
COPY --from=frontend-build /app/build ./build

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]
```

#### Deploy with Docker
```bash
# Build image
docker build -t order-management-app .

# Run container
docker run -p 3001:3001 order-management-app

# Or use docker-compose
```

#### Docker Compose (Recommended)
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped
```

### Option 4: VPS Deployment

For full control over your deployment.

#### Setup on Ubuntu/Debian VPS

1. **Server Setup**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install Python
   sudo apt install python3 python3-pip -y
   ```

2. **Deploy Application**
   ```bash
   # Clone repository
   git clone <your-repo-url>
   cd your-app
   
   # Install dependencies
   npm install
   pip3 install -r requirements.txt
   
   # Start with PM2
   npm install -g pm2
   pm2 start server.js --name "order-app"
   pm2 startup
   pm2 save
   ```

3. **Configure Nginx (Reverse Proxy)**
   ```bash
   # Install Nginx
   sudo apt install nginx -y
   
   # Create site configuration
   sudo nano /etc/nginx/sites-available/order-app
   ```

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;  # Replace with your domain or IP
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   ```bash
   # Enable site
   sudo ln -s /etc/nginx/sites-available/order-app /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## 🔧 Configuration Updates

### Update Frontend API Configuration

Create a configuration file for different environments:

```javascript
// src/config/api.js
const config = {
  development: {
    apiUrl: 'http://localhost:3001'
  },
  production: {
    apiUrl: process.env.REACT_APP_API_URL || 'https://your-backend-url.com'
  }
};

export default config[process.env.NODE_ENV || 'development'];
```

### Environment Variables

Create `.env` files for different environments:

```bash
# .env.production
REACT_APP_API_URL=https://your-backend-url.com
REACT_APP_ENV=production

# .env.development
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ENV=development
```

## 🛡️ Security Considerations

### Production Security Checklist

1. **Environment Variables**
   - Never commit `.env` files
   - Use secure secret management
   - Rotate API keys regularly

2. **HTTPS Configuration**
   ```bash
   # Get free SSL certificate with Let's Encrypt
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

3. **Firewall Configuration**
   ```bash
   # Configure UFW firewall
   sudo ufw allow ssh
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

4. **Rate Limiting**
   ```javascript
   // Add to server.js
   const rateLimit = require('express-rate-limit');
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   
   app.use('/api/', limiter);
   ```

## 📊 Monitoring & Maintenance

### Health Monitoring

```javascript
// Add to server.js
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

### Logging Setup

```bash
# Install PM2 logging
pm2 install pm2-logrotate

# View logs
pm2 logs order-app

# Monitor
pm2 monit
```

## 🚀 Quick Start Commands

### Local Network Deployment
```bash
# 1. Update server.js to listen on 0.0.0.0
# 2. Find your IP address
# 3. Update frontend API URLs
# 4. Start services
node server.js &
npm start
```

### Cloud Deployment (Heroku)
```bash
# 1. Install Heroku CLI
# 2. Login and create app
heroku create your-app-name
# 3. Deploy
git push heroku main
```

### Docker Deployment
```bash
# 1. Create Dockerfile (provided above)
# 2. Build and run
docker build -t order-app .
docker run -p 3001:3001 order-app
```

## 🔍 Testing Your Deployment

### Test Checklist

1. **Frontend Access**
   - ✅ Application loads correctly
   - ✅ All pages are accessible
   - ✅ No console errors

2. **Backend API**
   - ✅ Health endpoint responds
   - ✅ PDF upload works
   - ✅ Data extraction functions

3. **Cross-Network Access**
   - ✅ External users can access
   - ✅ File uploads work
   - ✅ All features functional

### Test Commands

```bash
# Test health endpoint
curl http://your-domain.com/health

# Test API endpoint
curl -X POST -F "pdf=@test.pdf" http://your-domain.com/api/extract-pdf
```

## 📞 Support & Troubleshooting

### Common Issues

1. **Port Access Issues**
   - Check firewall settings
   - Verify port forwarding
   - Ensure service is running

2. **Python Dependencies**
   - Verify Python installation
   - Check pip packages
   - Test script manually

3. **File Upload Issues**
   - Check file permissions
   - Verify upload directory
   - Test with smaller files

### Debug Commands

```bash
# Check if ports are listening
netstat -tlnp | grep :3001

# Test Python script
python3 universal_pdf_extractor.py --help

# Check Node.js process
ps aux | grep node

# View application logs
pm2 logs order-app
```

## 🎯 Recommended Approach

For **testing with external users**, I recommend:

1. **Start with Local Network** (Option 1) - Quickest to set up
2. **Move to Cloud Deployment** (Option 2) - Most reliable for external access
3. **Use Docker** (Option 3) - Best for consistent deployments

Choose based on your needs:
- **Local Network**: Quick testing with colleagues
- **Heroku/Railway**: Free hosting for demos
- **VPS**: Full control for production use

## 📋 Deployment Checklist

- [ ] Update server.js to listen on 0.0.0.0 (for local network)
- [ ] Configure frontend API URLs
- [ ] Set up firewall rules
- [ ] Test all functionality
- [ ] Share access URLs with testers
- [ ] Monitor logs and performance
- [ ] Set up SSL certificates (for production)
- [ ] Configure domain name (optional)

Your application is now ready for external testing! 🎉
