# PDF Extractor Production Integration Guide

This guide explains how to integrate the Python PDF extractor with your React application for production use.

## 🏗️ Architecture Overview

```
┌─────────────────┐    HTTP POST    ┌─────────────────┐    Python    ┌─────────────────┐
│   React App     │ ──────────────► │  Node.js API    │ ──────────► │ PDF Extractor   │
│  (Frontend)     │                 │   (Backend)     │             │   (Python)      │
└─────────────────┘                 └─────────────────┘             └─────────────────┘
```

## 📁 Files Created

### Backend Files
- `server.js` - Express.js API server
- `backend-package.json` - Node.js dependencies
- `requirements.txt` - Python dependencies
- `setup-python.sh` / `setup-python.bat` - Python setup scripts
- `test-backend.sh` / `test-backend.bat` - API testing scripts
- `deploy.sh` - Complete deployment script

### Updated Files
- `src/services/pdfExtractorService.ts` - Updated to call backend API
- `universal_pdf_extractor.py` - Enhanced with JSON output markers

## 🚀 Quick Deployment

### Option 1: Automated Deployment
```bash
chmod +x deploy.sh
./deploy.sh
```

### Option 2: Manual Setup

#### 1. Setup Python Environment
```bash
# Linux/macOS
chmod +x setup-python.sh
./setup-python.sh

# Windows
setup-python.bat
```

#### 2. Setup Node.js Backend
```bash
cp backend-package.json package.json
npm install
```

#### 3. Start Backend Server
```bash
npm start
```

#### 4. Test the API
```bash
# Linux/macOS
chmod +x test-backend.sh
./test-backend.sh

# Windows
test-backend.bat
```

## 🔧 Frontend Integration

The frontend has been updated to automatically use the backend API. The `PDFExtractorService` now:

1. **Calls Backend API**: Sends PDF files to `http://localhost:3001/api/extract-pdf`
2. **Fallback Mode**: If backend is unavailable, falls back to simulation mode
3. **Error Handling**: Gracefully handles network errors and timeouts

### API Endpoint Details

**URL**: `POST http://localhost:3001/api/extract-pdf`

**Request**:
- Content-Type: `multipart/form-data`
- Body: PDF file (max 10MB)

**Response**:
```json
{
  "success": true,
  "data": {
    "PO_NUMBER": "PO123456",
    "PO_ISSUER_NAME": "Company Name",
    "MATERIAL": "Material Name",
    "QUANTITY": 100,
    "UNIT_PRICE": "10.00",
    "TOTAL_AMOUNT": "1000.00",
    "CURRENCY": "USD"
  },
  "confidence": 0.95,
  "model_info": {
    "name": "Universal PDF Extractor",
    "detected_format": "pharmaceutical_po"
  }
}
```

## 🐍 Python Dependencies

The following Python packages are automatically installed:

- **PyMuPDF (fitz)**: PDF text extraction
- **Pillow**: Image processing
- **NumPy**: Numerical operations
- **regex**: Advanced pattern matching

## 🔄 How It Works

### 1. User Uploads PDF
- User clicks "Create Order with AI" in React app
- Uploads PDF file through the interface

### 2. Frontend Calls Backend
- React app sends PDF to Node.js API
- API validates file and saves temporarily

### 3. Python Processing
- Node.js spawns Python process
- Python script extracts data from PDF
- Returns structured JSON result

### 4. Response to Frontend
- Backend parses Python output
- Sends JSON response to React app
- Frontend creates order with extracted data

## 🛠️ Configuration

### Environment Variables
```bash
PORT=3001                    # Backend server port
NODE_ENV=production          # Environment mode
UPLOAD_DIR=uploads          # Temporary file directory
PYTHON_PATH=/usr/bin/python3 # Python executable path
```

### File Limits
- **Max file size**: 10MB
- **Processing timeout**: 30 seconds
- **Supported formats**: PDF only

## 🔒 Security Considerations

### Production Recommendations
1. **Authentication**: Add API key or JWT authentication
2. **Rate Limiting**: Implement request rate limiting
3. **File Validation**: Enhanced PDF validation
4. **HTTPS**: Use SSL/TLS in production
5. **Input Sanitization**: Validate all inputs
6. **Error Handling**: Don't expose internal errors

### Example Security Middleware
```javascript
// Add to server.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## 📊 Monitoring & Logging

### Health Check Endpoint
```bash
curl http://localhost:3001/health
```

### Logging Configuration
```javascript
// Add to server.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## 🚀 Production Deployment

### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start server.js --name "pdf-extractor"
pm2 save
pm2 startup
```

### Using Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN apk add --no-cache python3 py3-pip
RUN pip3 install -r requirements.txt
EXPOSE 3001
CMD ["npm", "start"]
```

### Using Nginx (Reverse Proxy)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🐛 Troubleshooting

### Common Issues

#### Python Script Not Found
```bash
# Check if script exists
ls -la universal_pdf_extractor.py

# Check permissions
chmod +x universal_pdf_extractor.py
```

#### Python Dependencies Missing
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check installation
python3 -c "import fitz; print('PyMuPDF OK')"
```

#### Port Already in Use
```bash
# Find process using port 3001
lsof -ti:3001

# Kill process
kill -9 $(lsof -ti:3001)

# Or change port in server.js
const PORT = process.env.PORT || 3002;
```

#### File Upload Issues
```bash
# Check upload directory permissions
ls -la uploads/

# Create directory if missing
mkdir -p uploads
chmod 755 uploads
```

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* npm start

# Test Python script directly
python3 universal_pdf_extractor.py --pdf_path test.pdf --verbose
```

## 📈 Performance Optimization

### Backend Optimizations
1. **File Cleanup**: Automatic cleanup of temporary files
2. **Memory Management**: Proper process cleanup
3. **Caching**: Cache frequently used data
4. **Connection Pooling**: Reuse database connections

### Python Optimizations
1. **Virtual Environment**: Use isolated Python environment
2. **Process Pooling**: Reuse Python processes
3. **Memory Limits**: Set memory limits for Python processes

## 🔄 Updates & Maintenance

### Updating Python Dependencies
```bash
pip install -r requirements.txt --upgrade
```

### Updating Node.js Dependencies
```bash
npm update
```

### Monitoring Health
```bash
# Check server status
curl http://localhost:3001/health

# Check Python script
python3 universal_pdf_extractor.py --help
```

## 📞 Support

For issues or questions:
1. Check the logs in `uploads/` directory
2. Review the `BACKEND_README.md` file
3. Test individual components using the test scripts
4. Check Python and Node.js versions compatibility

## 🎯 Next Steps

1. **Deploy the backend** using the provided scripts
2. **Test the integration** with your React app
3. **Configure production settings** (security, monitoring)
4. **Set up CI/CD pipeline** for automated deployments
5. **Monitor performance** and optimize as needed

The system is now ready for production use with real PDF extraction capabilities!
