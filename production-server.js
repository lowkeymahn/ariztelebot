const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable trust proxy for Railway
app.set('trust proxy', 1);

// Compression middleware
app.use(compression());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging middleware
app.use(morgan('combined'));

// Static file serving
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/static', express.static(path.join(process.cwd(), 'admin-dashboard')));

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Trim whitespace and convert to lowercase for comparison
  const cleanUsername = username?.trim().toLowerCase();
  const cleanPassword = password?.trim();
  
  // Simple hardcoded login for demo
  if (cleanUsername === 'admin' && cleanPassword === 'admin123') {
    const token = 'demo-token-' + Date.now();
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    
    res.json({
      success: true,
      admin: {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
      },
      token,
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Check authentication
app.get('/api/admin/me', (req, res) => {
  const token = req.cookies.adminToken;
  if (token && token.startsWith('demo-token-')) {
    res.json({
      admin: {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
      },
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Logout endpoint
app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('adminToken');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Basic CRUD endpoints (simplified)
app.get('/api/admin/bots', (req, res) => {
  res.json({ bots: [] });
});

app.get('/api/admin/bots/:botId/categories', (req, res) => {
  res.json({ categories: [] });
});

app.get('/api/admin/bots/:botId/products', (req, res) => {
  res.json({ products: [] });
});

app.get('/api/admin/bots/:botId/shipping', (req, res) => {
  res.json({ shipping: [] });
});

app.get('/api/admin/bots/:botId/payments', (req, res) => {
  res.json({ payments: [] });
});

app.get('/api/admin/bots/:botId/contacts', (req, res) => {
  res.json({ contacts: [] });
});

app.get('/api/admin/bots/:botId/users', (req, res) => {
  res.json({ users: [], stats: { total: 0, active: 0 } });
});

app.get('/api/admin/bots/:botId/broadcasts', (req, res) => {
  res.json({ broadcasts: [] });
});

// Serve admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'admin-dashboard', 'index.html'));
});

app.get('/', (req, res) => {
  res.redirect('/admin');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'admin-dashboard',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
  try {
    console.log('Starting production admin dashboard server...');
    console.log('Default admin credentials: admin / admin123');
    console.log('Environment:', process.env.NODE_ENV || 'development');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Admin dashboard server running on port ${PORT}`);
      console.log(`Access admin dashboard at: http://localhost:${PORT}/admin`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

startServer();

module.exports = app;