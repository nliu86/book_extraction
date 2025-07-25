import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { BookController } from './controllers/book.controller';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Book Extraction API' });
});

// Book extraction endpoints
const bookController = new BookController();
app.post('/api/extract-book', upload.single('image'), (req, res) => {
  bookController.extractBook(req, res);
});

// Book extraction with progress (SSE)
app.post('/api/extract-book-progress', upload.single('image'), (req, res) => {
  // Log incoming request
  console.log('[Server] Received request to /api/extract-book-progress');
  bookController.extractBookWithProgress(req, res);
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
app.listen(port, () => {
  console.log(`Book Extraction API running on port ${port}`);
  console.log(`Web UI: http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`API endpoint: POST http://localhost:${port}/api/extract-book`);
});