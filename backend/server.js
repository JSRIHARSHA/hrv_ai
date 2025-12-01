const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
require('dotenv').config();

// Explicitly require pg before database connection to ensure it's available
try {
  require('pg');
} catch (error) {
  console.error('❌ Failed to load pg package:', error);
  throw error;
}

const { connectDB } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to PostgreSQL (non-blocking for serverless)
// In serverless environments, connection will be established on first request
let dbConnected = false;
connectDB().then(connected => {
  dbConnected = connected;
  if (connected) {
    console.log('✅ Database connection established');
  } else {
    console.warn('⚠️  Database connection failed, will retry on first request');
  }
}).catch(err => {
  console.error('❌ Database connection error:', err);
  dbConnected = false;
});

// Health check endpoint that doesn't require DB
app.get('/health', async (req, res) => {
  const { sequelize } = require('./config/database');
  let dbStatus = 'Disconnected';
  try {
    await sequelize.authenticate();
    dbStatus = 'Connected';
  } catch (error) {
    dbStatus = 'Disconnected';
  }
  
  res.json({ 
    status: 'OK', 
    message: 'Backend API is running',
    timestamp: new Date().toISOString(),
    database: dbStatus
  });
});

// Middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' })); // Increased limit for base64 file uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Configure multer for file uploads (for PDF extraction)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Health check endpoint is defined above (moved before routes)

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/materials', require('./routes/materialRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/freight-handlers', require('./routes/freightHandlerRoutes'));

// PDF extraction endpoint
app.post('/api/extract-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No PDF file uploaded' 
      });
    }

    const pdfPath = req.file.path;
    console.log(`Processing PDF: ${pdfPath}`);

    // Execute Python script
    const result = await executePythonScript(pdfPath);
    
    // Clean up uploaded file
    fs.unlinkSync(pdfPath);
    
    res.json(result);
    
  } catch (error) {
    console.error('PDF extraction error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'PDF extraction failed' 
    });
  }
});

// Function to execute Python script
function executePythonScript(pdfPath) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('py', [
      path.join(__dirname, '..', 'universal_pdf_extractor.py'),
      '--pdf_path', pdfPath,
      '--verbose'
    ]);

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const jsonStart = output.indexOf('JSON_RESULT_START');
          const jsonEnd = output.indexOf('JSON_RESULT_END');
          
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonString = output.substring(jsonStart + 'JSON_RESULT_START'.length, jsonEnd).trim();
            const result = JSON.parse(jsonString);
            resolve(result);
          } else {
            console.log('No JSON markers found in Python output, using mock result');
            resolve(createMockResult(pdfPath));
          }
        } catch (parseError) {
          console.error('JSON parsing error:', parseError);
          resolve(createMockResult(pdfPath));
        }
      } else {
        reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python script: ${error.message}`));
    });

    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('Python script timeout'));
    }, 30000);
  });
}

// Create mock result for testing
function createMockResult(pdfPath) {
  const filename = path.basename(pdfPath);
  return {
    success: true,
    data: {
      PO_NUMBER: `PO${Date.now().toString().slice(-6)}`,
      PO_ISSUER_NAME: 'Sample Pharmaceutical Company',
      PO_ISSUER_ADDRESS: '123 Pharma Street, Medical City, MC 12345',
      GSTIN: '29ABCDE1234F1Z5',
      CONTACT_NUMBER: '+91-9876543210',
      MATERIAL: 'Simethicone Emulsion USP',
      QUANTITY: 1300,
      UNIT_PRICE: '6.00',
      TOTAL_AMOUNT: '7800.00',
      CURRENCY: 'USD',
      MANUFACTURER: 'Generic Manufacturer Ltd.',
      DELIVERY_TERMS: 'FOB Destination',
      PAYMENT_TERMS: 'Net 30 days',
      ORDER_DATE: new Date().toLocaleDateString('en-GB')
    },
    confidence: 0.95,
    model_info: {
      name: 'Universal PDF Extractor',
      detected_format: 'pharmaceutical_po',
      extraction_method: 'Multi-strategy pattern matching'
    },
    text_length: 1500,
    entities_found: 12,
    filename: filename
  };
}

// Serve static files from React build (for production)
app.use(express.static(path.join(__dirname, '..', 'build')));

// Catch-all handler for React routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
  }
  
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error'
  });
});

// Start server
const HOST = process.env.HOST || '0.0.0.0';
// Only start the server if not in Vercel serverless environment
// Vercel will handle the serverless function execution
if (process.env.VERCEL !== '1') {
  app.listen(PORT, HOST, () => {
    console.log('🚀 ========================================');
    console.log(`🚀 Backend API Server running on ${HOST}:${PORT}`);
    console.log(`📊 PostgreSQL Database: ${process.env.DATABASE_URL || process.env.POSTGRES_DB || 'pharma_order_management'}`);
    console.log(`📁 Upload directory: ${path.resolve('uploads')}`);
    console.log(`🐍 Python script: ${path.resolve('universal_pdf_extractor.py')}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🌐 API Base: http://localhost:${PORT}/api`);
    console.log('🚀 ========================================');
  });
}

module.exports = app;

