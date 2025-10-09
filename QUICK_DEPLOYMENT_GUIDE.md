# 🚀 Quick Deployment Guide

This guide provides the fastest way to deploy your Order Management Application for external testing.

## ⚡ Quick Start (Choose One)

### Option 1: Local Network (Fastest - 2 minutes)

Perfect for testing with colleagues on the same network or VPN.

```bash
# Windows
deploy-production.bat

# Linux/macOS
./deploy-production.sh
```

**What it does:**
- Installs dependencies
- Starts backend on all network interfaces
- Starts frontend
- Shows your IP address for sharing

**Share this URL:** `http://YOUR_IP:3001`

### Option 2: Docker (Most Reliable - 5 minutes)

```bash
# Build and run with Docker
docker build -t order-management-app .
docker run -p 3001:3001 order-management-app
```

**Share this URL:** `http://YOUR_IP:3001`

### Option 3: Heroku (Cloud - 10 minutes)

```bash
# Install Heroku CLI first
# Windows: Download from heroku.com
# macOS: brew install heroku/brew/heroku
# Linux: curl https://cli-assets.heroku.com/install.sh | sh

# Deploy
heroku create your-app-name
git push heroku main
```

**Share this URL:** `https://your-app-name.herokuapp.com`

## 🔧 Manual Setup (If scripts don't work)

### 1. Install Dependencies

```bash
# Node.js dependencies
npm install

# Python dependencies
pip install -r requirements.txt
```

### 2. Configure for External Access

The `server.js` file has been updated to listen on all interfaces (`0.0.0.0`).

### 3. Find Your IP Address

```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
```

### 4. Start the Application

```bash
# Terminal 1: Backend
node server.js

# Terminal 2: Frontend
npm start
```

### 5. Share Access

- **Frontend:** `http://YOUR_IP:3000`
- **Backend API:** `http://YOUR_IP:3001`
- **Health Check:** `http://YOUR_IP:3001/health`

## 🔥 Firewall Configuration

### Windows Firewall

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Node.js Backend" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
New-NetFirewallRule -DisplayName "Node.js Frontend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

### macOS Firewall

```bash
# Allow incoming connections
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
```

### Linux Firewall

```bash
# Ubuntu/Debian
sudo ufw allow 3001
sudo ufw allow 3000

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## 🌐 Cloud Deployment Options

### Heroku (Free Tier)

1. Create account at [heroku.com](https://heroku.com)
2. Install Heroku CLI
3. Run deployment script or manually:
   ```bash
   heroku create your-app-name
   git push heroku main
   ```

### Railway (Modern Alternative)

1. Create account at [railway.app](https://railway.app)
2. Install Railway CLI
3. Deploy:
   ```bash
   railway login
   railway init
   railway up
   ```

### Vercel (Frontend Focused)

1. Create account at [vercel.com](https://vercel.com)
2. Install Vercel CLI
3. Deploy:
   ```bash
   vercel login
   vercel --prod
   ```

## 📱 Testing Your Deployment

### 1. Health Check

```bash
curl http://YOUR_IP:3001/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "PDF Extractor API is running",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 2. Test PDF Upload

```bash
curl -X POST -F "pdf=@test.pdf" http://YOUR_IP:3001/api/extract-pdf
```

### 3. Frontend Access

Open `http://YOUR_IP:3000` in a browser from another device on the network.

## 🚨 Troubleshooting

### Port Already in Use

```bash
# Find process using port 3001
netstat -ano | findstr :3001

# Kill process (Windows)
taskkill /PID <PID> /F

# Kill process (macOS/Linux)
kill -9 <PID>
```

### Python Not Found

```bash
# Windows
py --version

# macOS/Linux
python3 --version
```

### Dependencies Issues

```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### External Access Not Working

1. Check firewall settings
2. Verify IP address
3. Ensure application is listening on `0.0.0.0`
4. Test from same machine first: `http://localhost:3001`

## 📊 Monitoring

### Check Application Status

```bash
# Health endpoint
curl http://YOUR_IP:3001/health

# View logs
# Windows: Check console output
# Linux/macOS: Use pm2 or systemd
```

### Performance Monitoring

```bash
# Check memory usage
# Windows: Task Manager
# Linux/macOS: htop or top
```

## 🔐 Security Notes

### For Testing Only

The current setup is for **testing purposes only**. For production:

1. Add authentication
2. Use HTTPS
3. Implement rate limiting
4. Add input validation
5. Use environment variables for secrets

### Quick Security Improvements

```javascript
// Add to server.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## 📞 Support

If you encounter issues:

1. Check the console output for error messages
2. Verify all dependencies are installed
3. Test the health endpoint
4. Check firewall settings
5. Try accessing from the same machine first

## 🎯 Recommended Approach

**For quick testing with colleagues:**
1. Use **Local Network** deployment
2. Share your IP address
3. Ensure firewall allows connections

**For external users:**
1. Use **Heroku** (free tier)
2. Share the Heroku URL
3. No firewall configuration needed

**For production:**
1. Use **Docker** or **VPS**
2. Set up SSL certificates
3. Implement security measures

Your application is now ready for external testing! 🎉
