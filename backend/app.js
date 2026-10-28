// PriceProof: Express Application Configuration
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Route Handlers
const productRoutes = require('./routes/products');
const comparisonRoutes = require('./routes/comparison');
const shoppingListRoutes = require('./routes/shoppingLists');
const wishlistRoutes = require('./routes/wishlist');
const alertRoutes = require('./routes/alerts');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

const app = express();

// 1. Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://unpkg.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https://*.supabase.co'],
        connectSrc: ["'self'", 'https://*.supabase.co', 'https://cdn.jsdelivr.net'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// 2. CORS Configuration
const allowedOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow during development
      }
    },
    credentials: true,
  })
);

// 3. Body Parsers & Rate Limiter
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use('/api', apiLimiter);

// 4. API Endpoints
app.use('/api/products', productRoutes);
app.use('/api/comparison', comparisonRoutes);
app.use('/api/shopping-lists', shoppingListRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Config endpoint for client
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  });
});

// 5. Serve Static Frontend
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Handle unknown API routes (all methods) before the HTML fallback
app.use('/api', notFoundHandler);

// Fallback for HTML routing (non-API routes only)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 6. Centralized Error Handling
app.use(errorHandler);

module.exports = app;
