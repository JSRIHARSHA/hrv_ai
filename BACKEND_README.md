# PDF Extractor Backend API

This backend API service runs the Python PDF extractor script (`universal_pdf_extractor.py`) and provides a REST API for the React frontend to extract data from PDF files.

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v14 or higher)
- **Python 3.8+** with pip
- **Git** (to clone the repository)

### 1. Install Python Dependencies

#### For Linux/macOS:
```bash
chmod +x setup-python.sh
./setup-python.sh
```

#### For Windows:
```cmd
setup-python.bat
```

#### Manual Installation:
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt
```

### 2. Install Node.js Dependencies

```bash
# Copy the backend package.json
cp backend-package.json package.json

# Install dependencies
npm install
```

### 3. Start the Backend Server

```bash
npm start
```

The server will start on `http://localhost:3001`

### 4. Test the API

```bash
# Health check
curl http://localhost:3001/health

# Test PDF extraction (replace with your PDF file)
curl -X POST -F "pdf=@your-file.pdf" http://localhost:3001/api/extract-pdf
```

## 📁 Project Structure

```
├── server.js                 # Main Express server
├── universal_pdf_extractor.py # Python PDF extraction script
├── requirements.txt          # Python dependencies
├── backend-package.json      # Node.js dependencies
├── setup-python.sh          # Linux/macOS setup script
├── setup-python.bat         # Windows setup script
└── uploads/                 # Temporary PDF upload directory
```

## 🔧 API Endpoints

### Health Check
```
GET /health
```
Returns server status and timestamp.

### PDF Extraction
```
POST /api/extract-pdf
Content-Type: multipart/form-data
Body: pdf file (max 10MB)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "PO_NUMBER": "PO123456",
    "PO_ISSUER_NAME": "Company Name",
    "PO_ISSUER_ADDRESS": "Address",
    "GSTIN": "GSTIN123",
    "CONTACT_NUMBER": "+91-1234567890",
    "MATERIAL": "Material Name",
    "QUANTITY": 100,
    "UNIT_PRICE": "10.00",
    "TOTAL_AMOUNT": "1000.00",
    "CURRENCY": "USD",
    "MANUFACTURER": "Manufacturer",
    "DELIVERY_TERMS": "FOB",
    "PAYMENT_TERMS": "Net 30",
    "ORDER_DATE": "01/01/2024"
  },
  "confidence": 0.95,
  "model_info": {
    "name": "Universal PDF Extractor",
    "detected_format": "pharmaceutical_po",
    "extraction_method": "Multi-strategy pattern matching"
  },
  "text_length": 1500,
  "entities_found": 12
}
```

## 🐍 Python Dependencies

The following Python packages are required:

- **PyMuPDF (fitz)**: PDF text extraction and processing
- **Pillow**: Image processing (optional)
- **NumPy**: Numerical operations (optional)
- **regex**: Advanced text pattern matching

## 🔄 Development Mode

For development with auto-restart:

```bash
npm run dev
```

This uses `nodemon` to automatically restart the server when files change.

## 🐛 Troubleshooting

### Python Script Not Found
- Ensure `universal_pdf_extractor.py` is in the same directory as `server.js`
- Check file permissions: `chmod +x universal_pdf_extractor.py`

### Python Dependencies Issues
- Verify Python version: `python3 --version`
- Check pip installation: `pip3 --version`
- Reinstall dependencies: `pip install -r requirements.txt --force-reinstall`

### Port Already in Use
- Change the port in `server.js`: `const PORT = process.env.PORT || 3002;`
- Kill existing process: `lsof -ti:3001 | xargs kill -9` (Linux/macOS)

### File Upload Issues
- Check upload directory permissions
- Verify file size limits (10MB max)
- Ensure PDF file format is correct

## 🔒 Security Notes

- The server accepts file uploads - implement proper validation in production
- Add authentication/authorization as needed
- Consider rate limiting for API endpoints
- Use HTTPS in production environments

## 📊 Performance

- **File Size Limit**: 10MB
- **Processing Timeout**: 30 seconds
- **Concurrent Requests**: Limited by Node.js event loop
- **Memory Usage**: Depends on PDF complexity

## 🚀 Production Deployment

### Using PM2 (Process Manager)
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
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Variables
```bash
PORT=3001
NODE_ENV=production
UPLOAD_DIR=uploads
PYTHON_PATH=/usr/bin/python3
```

## 📝 Logs

The server logs important events to the console:
- Server startup
- File uploads
- Python script execution
- Errors and exceptions

For production, consider using a proper logging library like `winston`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.
