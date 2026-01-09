// ==================== IMPORTS ====================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// ==================== CLOUDINARY CONFIGURATION ====================
cloudinary.config({
  cloud_name: "Loopcart", // Your cloud name
  api_key: "756521621842478", // Your API key
  api_secret: "A9k7y1CF783eXO8NzmcRSRSWCbk", // Your API secret
  secure: true
});

console.log("🌥️ Cloudinary configured with cloud name: Loopcart");

// ==================== APP SETUP ====================
const app = express();

// Middleware for Render
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'file://', 'https://loopcart-frontend.onrender.com', 'https://*.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Origin', 'X-Requested-With', 'Accept']
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Remove local uploads serving for production
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Public directory path - adjusted for Render
const publicPath = path.join(__dirname, '..', 'public');
console.log(`📁 Looking for HTML files at: ${publicPath}`);

if (fs.existsSync(publicPath)) {
  console.log(`✅ Found public directory at: ${publicPath}`);
  app.use(express.static(publicPath));
} else {
  console.log(`📁 Creating public directory at: ${publicPath}`);
  try {
    fs.mkdirSync(publicPath, { recursive: true });
    app.use(express.static(publicPath));
  } catch (err) {
    console.error(`❌ Could not create public directory: ${err.message}`);
    app.use(express.static(__dirname));
  }
}

// ==================== FILE UPLOAD CONFIGURATION (CLOUDINARY) ====================
const storage = multer.memoryStorage(); // Store in memory for Cloudinary upload

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed (jpeg, jpg, png, gif, webp)'));
  }
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = async (fileBuffer, folder = 'loopcart') => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('✅ Cloudinary upload successful:', result.secure_url);
            resolve(result);
          }
        }
      );
      
      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// ==================== DATABASE CONNECTION ====================
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://pavanumesh221_db_user:GkVcwRQ9xJ542XfZ@cluster.cuyf0ap.mongodb.net/loopcart?retryWrites=true&w=majority";

console.log("🔗 Connecting to MongoDB Atlas...");

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
})
.then(() => {
  console.log("✅ MongoDB Atlas connected successfully!");
  console.log("📊 Database: loopcart");
})
.catch(err => {
  console.error("❌ MongoDB Connection Error:", err.message);
  console.log("⚠️ Server will continue without database connection");
});

// ==================== MODELS (Keep your existing models) ====================
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: String,
  password: { type: String, required: true },
  role: { type: String, enum: ["buyer", "seller", "recycler", "admin"], default: "buyer" },
  address: String,
  location: String,
  whatsapp: String,
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  savedProducts: [{
    productId: mongoose.Schema.Types.ObjectId,
    title: String,
    price: Number,
    image: String,
    category: String,
    savedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  location: { type: String, required: true },
  image: String, // Now will store Cloudinary URL
  images: [String],
  weight: String,
  condition: { type: String, default: "Used - Good" },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  sellerName: String,
  sellerPhone: String,
  sellerWhatsApp: String,
  quantity: { type: Number, default: 1 },
  pricePerUnit: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },
  type: { type: String, enum: ["sell", "recycle"], default: "sell" },
  status: { type: String, default: "active" },
  recommendedListing: { type: String, enum: ["buyers", "recyclers"], default: "buyers" },
  views: { type: Number, default: 0 },
  saves: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true },
  biddingEnabled: { type: Boolean, default: false },
  currentHighestBid: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const bidSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  bidder: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bidderName: { type: String, required: true },
  bidderEmail: { type: String, required: true },
  bidderPhone: String,
  recycler: String,
  amount: { type: Number, required: true, min: 0 },
  status: { 
    type: String, 
    enum: ["pending", "leading", "accepted", "rejected", "completed", "cancelled"], 
    default: "pending" 
  },
  bidTime: { type: Date, default: Date.now },
  pickupStatus: { 
    type: String, 
    enum: ["not_scheduled", "scheduled", "completed", "cancelled"], 
    default: "not_scheduled"
  },
  pickupDate: Date,
  pickupTime: String,
  pickupLocation: String,
  pickupNotes: String,
  sellerContacted: { type: Boolean, default: false },
  whatsappMessageSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const Product = mongoose.model("Product", productSchema);
const Bid = mongoose.model("Bid", bidSchema);

// ==================== MIDDLEWARE ====================
const authMiddleware = async (req, res, next) => {
  try {
    // Try to get token from multiple possible locations
    const token = req.header('x-auth-token') || 
                 req.header('Authorization')?.replace('Bearer ', '') ||
                 req.body.token ||
                 req.query.token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'loopcartsecret');
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

// ==================== UPDATE PRODUCT CREATION FOR CLOUDINARY ====================
// Create product (for sellers) - UPDATED FOR CLOUDINARY
app.post("/api/products", authMiddleware, upload.single('image'), async (req, res) => {
  try {
    console.log("🔍 Received product creation request");
    
    // Check if user is seller
    if (req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: "Only sellers can create products"
      });
    }
    
    const user = await User.findById(req.user.id);
    
    // Parse form data fields
    const {
      title,
      description,
      category,
      location,
      weight,
      condition,
      quantity,
      pricePerUnit,
      totalPrice,
      recommendedListing
    } = req.body;

    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Title, description and category are required"
      });
    }

    // Handle image upload to Cloudinary
    let imageUrl = '';
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'loopcart/products');
        imageUrl = uploadResult.secure_url;
        console.log("✅ Image uploaded to Cloudinary:", imageUrl);
      } catch (uploadError) {
        console.error("❌ Cloudinary upload failed:", uploadError);
        // Continue without image
      }
    }

    // Calculate prices
    const qty = parseInt(quantity) || 1;
    const unitPrice = parseFloat(pricePerUnit) || 0;
    const calculatedTotal = totalPrice ? parseFloat(totalPrice) : (qty * unitPrice);

    // Determine type based on recommendedListing
    let productType = "sell";
    if (recommendedListing === "recyclers") {
      productType = "recycle";
      console.log("🔄 Setting product type to 'recycle'");
    }

    // Create product
    const product = new Product({
      title: title || 'Untitled item',
      description: description || '',
      price: calculatedTotal,
      category: category || 'General',
      location: location || user.location || 'India',
      image: imageUrl, // Cloudinary URL
      weight: weight || '',
      condition: condition || "Used - Good",
      seller: req.user.id,
      sellerName: user.name,
      sellerPhone: user.phone,
      sellerWhatsApp: user.whatsapp || user.phone,
      quantity: qty,
      pricePerUnit: unitPrice,
      totalPrice: calculatedTotal,
      type: productType,
      recommendedListing: recommendedListing || "buyers",
      status: "active",
      isAvailable: true
    });

    await product.save();
    
    console.log("✅ Product created successfully with Cloudinary image");

    res.json({
      success: true,
      product,
      message: "Product created successfully"
    });
  } catch (error) {
    console.error("❌ Create product error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message
    });
  }
});

// ==================== UPDATE ALL OTHER ENDPOINTS TO USE CLOUDINARY ====================

// Update the getImageUrl helper function for frontend
app.get("/api/cloudinary/config", (req, res) => {
  res.json({
    cloud_name: "Loopcart",
    api_key: "756521621842478",
    // Don't expose secret on frontend
    upload_preset: "loopcart_unsigned" // You need to create this in Cloudinary
  });
});

// ==================== HEALTH CHECK ====================
app.get("/api/health", (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running on Render with Cloudinary!', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    cloudinary: cloudinary.config().cloud_name ? 'Configured' : 'Not configured',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==================== KEEP ALL YOUR EXISTING ROUTES ====================
// Keep all your existing routes (auth, products, bids, etc.) exactly as they are
// Only the product creation and image handling needs Cloudinary updates

// ... [Keep all your existing routes here] ...

// ==================== FRONTEND ROUTES ====================
// Define specific routes for main pages
const routes = {
  "/": "index.html",
  "/recycle": "recycle.html", 
  "/redashboard": "redashboard.html",
  "/signup": "signup.html",
  "/login": "login.html",
  "/shop": "shop.html",
  "/carbon": "Carbon.html",
  "/services": "services.html",
  "/about": "about.html",
  "/blog": "blog.html",
  "/contact": "contact.html",
  "/checkout": "checkout.html",
  "/cart": "cart.html",
  "/thankyou": "thankyou.html",
  "/buyer": "Buyer.html",
  "/seller": "Seller.html",
  "/dashboard": "dashboard.html"
};

// Helper function to serve HTML files
const serveHTML = (file) => {
  return (req, res) => {
    const filePath = path.join(publicPath, file);
    
    if (fs.existsSync(filePath)) {
      console.log(`✅ Serving: ${file} from ${filePath}`);
      res.sendFile(filePath);
    } else {
      // Fallback to current directory for Render
      const altPath = path.join(__dirname, '..', 'public', file);
      if (fs.existsSync(altPath)) {
        res.sendFile(altPath);
      } else {
        res.status(404).json({
          success: false,
          message: `File ${file} not found`
        });
      }
    }
  };
};

// Create routes for each page
Object.entries(routes).forEach(([route, file]) => {
  app.get(route, serveHTML(file));
});

// Also add routes with .html extension for direct access
app.get("/Buyer.html", serveHTML("Buyer.html"));
app.get("/Seller.html", serveHTML("Seller.html"));
app.get("/recycle.html", serveHTML("recycle.html"));
app.get("/redashboard.html", serveHTML("redashboard.html"));
app.get("/index.html", serveHTML("index.html"));
app.get("/dashboard.html", serveHTML("dashboard.html"));

// Catch-all for SPA routing
app.get('*', (req, res) => {
  // Don't intercept API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: `API endpoint ${req.path} not found`
    });
  }
  
  // Serve index.html for all other routes (SPA)
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({
      success: false,
      message: 'Home page not found'
    });
  }
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`🌥️ Cloudinary: ${cloudinary.config().cloud_name}`);
  console.log(`📁 Serving from: ${publicPath}`);
  console.log(`\n🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Cloudinary config: http://localhost:${PORT}/api/cloudinary/config`);
  console.log(`\n✅ Ready for Render deployment!`);
});
