require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const paymentRoutes = require('./routes/payment');
const orderRoutes = require('./routes/orders');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Import User model for fallback login
const User = require('./models/User');

// Check and seed super_admin if not exists
const seedSuperAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ role: 'super_admin' });
    if (!existingAdmin) {
      const admin = new User({
        fullName: 'Super Admin',
        email: 'admin@lekevogue.shop',
        password: 'Admin@12345',
        role: 'super_admin',
        isActive: true
      });
      await admin.save();
      console.log('Super admin seeded: admin@lekevogue.shop / Admin@12345');
    }
  } catch (error) {
    console.error('Error seeding super admin:', error);
  }
};
seedSuperAdmin();

// Trust proxy for Railway (needed for rate limiting)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  trustProxy: 1,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: '*', // In production, replace with specific origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser - increase limit for file uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/orders', orderRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Leke Vogue API is running',
    timestamp: new Date().toISOString()
  });
});

// Dashboard static files (served from backend for simplicity)
app.use('/admin', express.static(__dirname + '/public'));

// Serve assets folder for images
app.use('/assets', express.static(__dirname + '/assets'));

// Serve admin dashboard
app.get('/admin/*', (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});

// Admin setup page
app.get('/setup-admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Setup Admin - Leke Vogue</title>
    </head>
    <body style="font-family: Arial; padding: 50px; text-align: center;">
      <h1>Leke Vogue Admin Setup</h1>
      <button onclick="seedAdmin()" style="padding: 15px 30px; font-size: 18px; background: #6f42c1; color: white; border: none; cursor: pointer; border-radius: 5px;">Create Admin Account</button>
      <p id="result"></p>
      <script>
      async function seedAdmin() {
        try {
          const response = await fetch('/api/auth/seed-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          const data = await response.json();
          document.getElementById('result').textContent = data.message || (data.success ? 'Admin created: admin@lekevogue.shop / Admin@12345' : 'Error: ' + data.message);
        } catch(e) {
          document.getElementById('result').textContent = 'Error: ' + e.message;
        }
      }
      </script>
    </body>
    </html>
  `);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`Admin login: admin@lekevogue.shop / Admin@12345`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
});

module.exports = app;
