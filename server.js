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
require('dotenv').config();
// ==================== APP SETUP ====================
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500',
    'https://loopcart.onrender.com', // Your Render frontend URL
    'https://your-frontend-name.onrender.com', 'file://'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  next();
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Public directory path
const publicPath = path.join(__dirname, '..', 'public');
console.log(`📁 Looking for HTML files at: ${publicPath}`);

if (fs.existsSync(publicPath)) {
  console.log(`✅ Found public directory at: ${publicPath}`);
  app.use(express.static(publicPath));
  
  // List files for debugging
  try {
    const files = fs.readdirSync(publicPath);
    console.log(`📂 Files in public directory:`, files.slice(0, 10));
  } catch (err) {
    console.log(`⚠️ Could not list files: ${err.message}`);
  }
} else {
  console.error(`❌ Public directory not found at: ${publicPath}`);
  console.log(`📁 Current directory: ${__dirname}`);
  
  try {
    fs.mkdirSync(publicPath, { recursive: true });
    console.log(`✅ Created public directory at: ${publicPath}`);
    app.use(express.static(publicPath));
  } catch (err) {
    console.error(`❌ Could not create public directory: ${err.message}`);
    app.use(express.static(__dirname));
  }
}

// Create uploads directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

// ==================== FILE UPLOAD CONFIGURATION ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed'));
  }
});

// ==================== DATABASE CONNECTION ====================
const MONGO_URI = "mongodb+srv://pavanumesh221_db_user:GkVcwRQ9xJ542XfZ@cluster.cuyf0ap.mongodb.net/loopcart?retryWrites=true&w=majority";

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
});

// ==================== MODELS ====================
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
  image: String,
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

    const decoded = jwt.verify(token, 'loopcartsecret');
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
      console.error(`❌ File not found: ${filePath}`);
      
      // Try alternative paths
      const alternativePaths = [
        path.join(__dirname, 'public', file),
        path.join(__dirname, '..', 'document', file),
        path.join(__dirname, 'document', file)
      ];
      
      for (const altPath of alternativePaths) {
        if (fs.existsSync(altPath)) {
          console.log(`✅ Found alternative: ${altPath}`);
          return res.sendFile(altPath);
        }
      }
      
      res.status(404).send(`
        <html>
          <head><title>404 - Page Not Found</title></head>
          <body>
            <h1>404 - Page Not Found</h1>
            <p>The file <strong>${file}</strong> was not found.</p>
            <p>Looking in: <strong>${filePath}</strong></p>
            <p>Check if your HTML files are in the correct location.</p>
          </body>
        </html>
      `);
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

// ==================== API HEALTH CHECK ====================
app.get("/api/health", (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running successfully', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    publicPath: publicPath,
    filesFound: fs.existsSync(publicPath) ? fs.readdirSync(publicPath) : 'Directory not found'
  });
});

// ==================== TEST ENDPOINTS ====================
app.get("/api/test/recycle", (req, res) => {
  res.json({
    success: true,
    message: "Recycle API endpoint is working!",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/auth/test", (req, res) => {
  res.json({ 
    message: "Authentication endpoint is working",
    endpoints: {
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      profile: "GET /api/auth/me"
    }
  });
});

// ==================== DEBUG AUTH ====================
app.get("/api/debug/auth", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: "Token is valid",
    user: req.user
  });
});

// Test endpoint without auth to verify token format
app.post("/api/debug/verify-token", (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.json({
        success: false,
        message: "No token provided"
      });
    }
    
    const decoded = jwt.verify(token, 'loopcartsecret');
    res.json({
      success: true,
      message: "Token is valid",
      decoded: decoded
    });
  } catch (error) {
    res.json({
      success: false,
      message: "Token verification failed",
      error: error.message
    });
  }
});

// ==================== DEBUG ENDPOINT ====================
app.get("/api/debug/products", async (req, res) => {
  try {
    console.log("🔍 Debug: Checking all products in database...");
    
    const allProducts = await Product.find({}).sort({ createdAt: -1 }).limit(10);
    const totalCount = await Product.countDocuments({});
    const recycleCount = await Product.countDocuments({
      $or: [
        { type: "recycle" },
        { recommendedListing: "recyclers" }
      ]
    });
    
    res.json({
      success: true,
      counts: {
        total: totalCount,
        recycle: recycleCount
      },
      allProducts: allProducts.map(p => ({
        id: p._id,
        title: p.title,
        category: p.category,
        type: p.type,
        recommendedListing: p.recommendedListing,
        sellerName: p.sellerName,
        price: p.price,
        status: p.status,
        isAvailable: p.isAvailable
      }))
    });
    
  } catch (error) {
    console.error("❌ Debug error:", error);
    res.status(500).json({
      success: false,
      message: "Debug error: " + error.message
    });
  }
});

// ==================== RECYCLE PRODUCTS ENDPOINT ====================
app.get("/api/products/recycle", async (req, res) => {
  try {
    console.log("🔍 Fetching recyclable products...");
    
    // Build query for recyclable products
    const query = {
      $and: [
        { status: "active" },
        { isAvailable: true },
        {
          $or: [
            { type: "recycle" },
            { recommendedListing: "recyclers" },
            {
              category: {
                $in: [
                  "Plastic Materials", "Metal & Scrap", "Paper & Cardboard",
                  "Electronics & E-waste", "Glass Materials", "Organic Waste",
                  "Textiles & Fabric", "Construction Waste",
                  "plastic", "metal", "paper", "electronics", "glass", "organic", "textile", "construction",
                  "Plastic Waste", "Metal Scrap", "Paper & Cardboard", "Electronics",
                  "Glass Materials", "Organic Waste", "Textiles", "Construction Waste"
                ]
              }
            }
          ]
        }
      ]
    };

    console.log("📋 Query for recyclable products:", JSON.stringify(query));

    const products = await Product.find(query)
      .populate('seller', 'name phone email whatsapp')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${products.length} recyclable products`);

    res.json({
      success: true,
      count: products.length,
      products: products
    });
  } catch (error) {
    console.error("❌ Get recycle products error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message
    });
  }
});

// ==================== ALL PRODUCTS ENDPOINT ====================
app.get("/api/products", async (req, res) => {
  try {
    const { category, location, minPrice, maxPrice, search, type, recommendedListing } = req.query;
    
    let query = { status: "active" };
    
    // Apply filters
    if (category && category !== "All Categories" && category !== "all") query.category = category;
    if (location && location !== "All Locations" && location !== "all") query.location = location;
    if (type) query.type = type;
    if (recommendedListing) query.recommendedListing = recommendedListing;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search && search.trim() !== '') {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    
    const products = await Product.find(query)
      .populate('seller', 'name phone whatsapp')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: products.length,
      products: products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch products: ' + error.message 
    });
  }
});

// ==================== SEED RECYCLE PRODUCTS ====================
app.post("/api/seed/recycle-products", async (req, res) => {
  try {
    console.log("🌱 Seeding recyclable products...");
    
    // Get or create a seller
    let seller = await User.findOne({ email: "recycle@loopcart.com" });
    if (!seller) {
      seller = new User({
        name: "Eco Seller",
        email: "recycle@loopcart.com",
        password: await bcrypt.hash("recycle123", 10),
        phone: "+91 9876543210",
        role: "seller",
        location: "Bangalore",
        whatsapp: "+91 9876543210"
      });
      await seller.save();
      console.log("✅ Created seller:", seller.email);
    }

    const recycleProducts = [
      {
        title: "Plastic Bottles (PET) - 100 Pieces",
        description: "Clean PET plastic bottles ready for recycling. Collection of 100 bottles. Washed and sorted. Perfect for plastic recycling facilities.",
        price: 800,
        category: "Plastic Materials",
        location: "Bangalore",
        weight: "15 kg",
        condition: "Good",
        seller: seller._id,
        sellerName: seller.name,
        sellerPhone: seller.phone,
        sellerWhatsApp: seller.whatsapp,
        type: "recycle",
        recommendedListing: "recyclers",
        status: "active",
        isAvailable: true,
        biddingEnabled: true,
        image: "plastic-bottles.jpg",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Aluminum Cans Scrap - 200 Cans",
        description: "Clean aluminum beverage cans. Approximately 200 cans. Crushed and ready for melting. High-quality aluminum scrap.",
        price: 1200,
        category: "Metal & Scrap",
        location: "Mumbai",
        weight: "8 kg",
        condition: "Excellent",
        seller: seller._id,
        sellerName: seller.name,
        sellerPhone: seller.phone,
        sellerWhatsApp: seller.whatsapp,
        type: "recycle",
        recommendedListing: "recyclers",
        status: "active",
        isAvailable: true,
        biddingEnabled: true,
        image: "aluminum-cans.jpg",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Office Paper Waste - 25kg",
        description: "Clean office paper waste (A4 size). No plastic or staples. Approximately 25kg. Perfect for paper recycling mills.",
        price: 450,
        category: "Paper & Cardboard",
        location: "Delhi",
        weight: "25 kg",
        condition: "Good",
        seller: seller._id,
        sellerName: seller.name,
        sellerPhone: seller.phone,
        sellerWhatsApp: seller.whatsapp,
        type: "recycle",
        recommendedListing: "recyclers",
        status: "active",
        isAvailable: true,
        image: "paper-waste.jpg",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "E-Waste - Old Laptops (5 units)",
        description: "Collection of 5 old laptops for e-waste recycling. Includes batteries and chargers. Properly wiped of data.",
        price: 2500,
        category: "Electronics & E-waste",
        location: "Chennai",
        weight: "12 kg",
        condition: "Used",
        seller: seller._id,
        sellerName: seller.name,
        sellerPhone: seller.phone,
        sellerWhatsApp: seller.whatsapp,
        type: "recycle",
        recommendedListing: "recyclers",
        status: "active",
        isAvailable: true,
        biddingEnabled: true,
        image: "e-waste.jpg",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    const createdProducts = [];
    for (const productData of recycleProducts) {
      const product = new Product(productData);
      await product.save();
      createdProducts.push(product);
      console.log(`✅ Created product: ${product.title}`);
    }
    
    console.log(`🎉 Created ${createdProducts.length} recyclable products`);
    
    res.json({
      success: true,
      message: "Recyclable products seeded successfully",
      count: createdProducts.length,
      products: createdProducts
    });
    
  } catch (error) {
    console.error("❌ Seed recycle products error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message
    });
  }
});

// ==================== AUTH ENDPOINTS ====================
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required"
      });
    }

    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "User already exists with this email" 
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role: role || 'buyer'
    });

    await user.save();

    const payload = {
      user: {
        id: user._id,
        role: user.role,
        email: user.email,
        name: user.name
      }
    };

    const token = jwt.sign(payload, 'loopcartsecret', { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      token,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token: token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, phone, role, location } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email"
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      whatsapp: phone,
      role: role || "buyer",
      location: location || "India"
    });

    await user.save();

    const payload = {
      user: {
        id: user._id,
        role: user.role,
        email: user.email,
        name: user.name
      }
    };

    const token = jwt.sign(payload, 'loopcartsecret', { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        location: user.location,
        token: token
      },
      message: "Registration successful"
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ 
        success: false, 
        message: `This account is registered as a ${user.role}, not a ${role}` 
      });
    }

    const payload = {
      user: {
        id: user._id,
        role: user.role,
        email: user.email,
        name: user.name,
        phone: user.phone
      }
    };

    const token = jwt.sign(payload, 'loopcartsecret', { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token: token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get current user
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// ========== PRODUCT ROUTES ==========
// Get single product
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name phone email whatsapp');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    product.views += 1;
    await product.save();
    
    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// Create product (for sellers)
app.post("/api/products", authMiddleware, upload.single('image'), async (req, res) => {
  try {
    console.log("🔍 Received product creation request");
    console.log("📦 Body:", req.body);
    console.log("📁 File:", req.file);
    console.log("🎯 Recommended Listing:", req.body.recommendedListing);
    
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

    console.log("🎯 Recommended Listing (parsed):", recommendedListing);

    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Title, description and category are required"
      });
    }

    // Get image
    const image = req.file ? req.file.filename : null;

    // Calculate prices
    const qty = parseInt(quantity) || 1;
    const unitPrice = parseFloat(pricePerUnit) || 0;
    const calculatedTotal = totalPrice ? parseFloat(totalPrice) : (qty * unitPrice);

    // Determine type based on recommendedListing
    let productType = "sell"; // Default
    if (recommendedListing === "recyclers") {
      productType = "recycle";
      console.log("🔄 Setting product type to 'recycle'");
    } else {
      console.log("🛒 Setting product type to 'sell'");
    }

    // Create product
    const product = new Product({
      title: title || 'Untitled item',
      description: description || '',
      price: calculatedTotal, // Store total as main price
      category: category || 'General',
      location: location || user.location || 'India',
      image,
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
    
    console.log("✅ Product created successfully:", {
      id: product._id,
      title: product.title,
      type: product.type,
      recommendedListing: product.recommendedListing
    });

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

// Update product with form-data support
app.put("/api/products/:id", authMiddleware, upload.single('image'), async (req, res) => {
  try {
    console.log("🔍 Received product update request");
    console.log("📦 Body:", req.body);
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    // Check if user owns the product
    if (product.seller.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }
    
    // Update fields from form-data
    const {
      title,
      description,
      category,
      location,
      condition,
      quantity,
      pricePerUnit,
      totalPrice,
      type,
      recommendedListing
    } = req.body;

    if (title) product.title = title;
    if (description) product.description = description;
    if (category) product.category = category;
    if (location) product.location = location;
    if (condition) product.condition = condition;
    
    // Handle quantity and prices
    if (quantity) product.quantity = parseInt(quantity);
    if (pricePerUnit) product.pricePerUnit = parseFloat(pricePerUnit);
    
    // Calculate total if not provided
    if (totalPrice) {
      product.totalPrice = parseFloat(totalPrice);
      product.price = parseFloat(totalPrice);
    } else if (quantity && pricePerUnit) {
      product.totalPrice = product.quantity * product.pricePerUnit;
      product.price = product.totalPrice;
    }
    
    if (type) product.type = type;
    if (recommendedListing) product.recommendedListing = recommendedListing;
    
    // Update image if provided
    if (req.file) {
      product.image = req.file.filename;
    }
    
    product.updatedAt = Date.now();
    await product.save();
    
    res.json({
      success: true,
      product,
      message: "Product updated successfully"
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message
    });
  }
});

// Get products by seller
app.get("/api/my-products", authMiddleware, async (req, res) => {
  try {
    console.log("🔍 Fetching products for seller:", req.user.id);
    
    // Check if user is seller
    if (req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: "Only sellers can view their products"
      });
    }
    
    const products = await Product.find({ seller: req.user.id })
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${products.length} products for seller`);
    
    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error("❌ Get my products error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message
    });
  }
});

// Delete product
app.delete("/api/products/:id", authMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    // Check if user owns the product
    if (product.seller.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }
    
    await product.deleteOne();
    
    res.json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// ========== SPECIAL ENDPOINTS FOR SELLER PAGE ==========
// AI Enhance endpoint for sellers
app.post("/api/ai/enhance", authMiddleware, upload.single('image'), async (req, res) => {
  try {
    console.log("🤖 AI Enhance request received");
    
    const { title, condition, category } = req.body;
    
    // Generate AI-enhanced description
    const aiDescription = `This ${condition || 'excellent condition'} ${title || 'item'} is perfect for sustainable reuse. 
    ${category ? `Category: ${category}. ` : ''}Help reduce waste by giving it a new home! This product is eco-friendly and supports circular economy.`;
    
    // Suggest category if not provided
    const suggestedCategory = category || 'Home & Living';
    
    res.json({
      success: true,
      description: aiDescription,
      category: suggestedCategory,
      message: "AI enhancement completed"
    });
  } catch (error) {
    console.error("AI enhance error:", error);
    res.status(500).json({
      success: false,
      message: "AI service temporarily unavailable"
    });
  }
});

// Get seller dashboard data
app.get("/api/seller/dashboard", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: "Only sellers can access dashboard"
      });
    }
    
    const user = await User.findById(req.user.id);
    
    // Get stats
    const totalProducts = await Product.countDocuments({ seller: req.user.id });
    const activeProducts = await Product.countDocuments({ 
      seller: req.user.id, 
      status: "active" 
    });
    const productsForBuyers = await Product.countDocuments({ 
      seller: req.user.id,
      recommendedListing: "buyers"
    });
    const productsForRecyclers = await Product.countDocuments({ 
      seller: req.user.id,
      recommendedListing: "recyclers"
    });
    
    // Get recent products
    const recentProducts = await Product.find({ seller: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Calculate sustainability metrics
    const carbonSaved = totalProducts * 10; // 10kg per product
    const wasteDiverted = totalProducts * 5; // 5kg per product
    const ecoScore = totalProducts > 0 ? 85 : 0; // Base score
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location
      },
      stats: {
        totalProducts,
        activeProducts,
        productsForBuyers,
        productsForRecyclers,
        carbonSaved,
        wasteDiverted,
        ecoScore
      },
      recentProducts
    });
  } catch (error) {
    console.error("Get seller dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// ========== BID ROUTES ==========
// Place a bid (for recyclers)
app.post("/api/bids/product/:productId", authMiddleware, async (req, res) => {
  try {
    // Check if user is recycler
    if (req.user.role !== 'recycler') {
      return res.status(403).json({
        success: false,
        message: "Only recyclers can place bids"
      });
    }
    
    const user = await User.findById(req.user.id);
    
    const { amount } = req.body;
    
    // Check if product exists
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    // Check if product is for recyclers
    if (product.recommendedListing !== "recyclers" && product.type !== "recycle") {
      return res.status(400).json({
        success: false,
        message: "This product is not available for recycling bids"
      });
    }
    
    // Check for existing bid
    const existingBid = await Bid.findOne({
      product: req.params.productId,
      bidder: req.user.id
    });
    
    if (existingBid) {
      return res.status(400).json({
        success: false,
        message: "You have already placed a bid on this product"
      });
    }
    
    // Create bid
    const bid = new Bid({
      product: req.params.productId,
      bidder: req.user.id,
      bidderName: user.name,
      bidderEmail: user.email,
      bidderPhone: user.phone,
      recycler: user.name,
      amount,
      status: "pending"
    });
    
    await bid.save();
    
    // Update product's current highest bid
    if (amount > product.currentHighestBid) {
      product.currentHighestBid = amount;
      product.biddingEnabled = true;
      await product.save();
    }
    
    res.json({
      success: true,
      bid,
      message: "Bid placed successfully"
    });
  } catch (error) {
    console.error("Place bid error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// Get bids for a product
app.get("/api/bids/product/:productId", async (req, res) => {
  try {
    const bids = await Bid.find({ product: req.params.productId })
      .populate('bidder', 'name email phone')
      .sort({ amount: -1, bidTime: 1 });
    
    res.json({
      success: true,
      bids
    });
  } catch (error) {
    console.error("Get product bids error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// Get recycler's active bids
app.get("/api/bids/recycler/active", authMiddleware, async (req, res) => {
  try {
    // Check if user is recycler
    if (req.user.role !== 'recycler') {
      return res.status(403).json({
        success: false,
        message: "Only recyclers can view bids"
      });
    }
    
    const bids = await Bid.find({
      bidder: req.user.id,
      status: { $in: ["pending", "leading"] }
    })
    .populate({
      path: 'product',
      populate: {
        path: 'seller',
        select: 'name phone whatsapp'
      }
    })
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      bids,
      count: bids.length
    });
  } catch (error) {
    console.error("Get active bids error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// Get recycler's accepted bids
app.get("/api/bids/recycler/accepted", authMiddleware, async (req, res) => {
  try {
    // Check if user is recycler
    if (req.user.role !== 'recycler') {
      return res.status(403).json({
        success: false,
        message: "Only recyclers can view bids"
      });
    }
    
    const bids = await Bid.find({
      bidder: req.user.id,
      status: "accepted"
    })
    .populate({
      path: 'product',
      populate: {
        path: 'seller',
        select: 'name phone whatsapp'
      }
    })
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      bids,
      count: bids.length
    });
  } catch (error) {
    console.error("Get accepted bids error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// Accept a bid (seller accepts bid)
app.put("/api/bids/:bidId/accept", authMiddleware, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.bidId)
      .populate('product')
      .populate('bidder', 'name phone whatsapp');
    
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: "Bid not found"
      });
    }
    
    const product = await Product.findById(bid.product._id);
    
    // Check if user is the seller
    if (product.seller.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }
    
    // Update bid status to accepted
    bid.status = "accepted";
    bid.pickupStatus = "pending";
    await bid.save();
    
    // Update product status
    product.status = "accepted";
    product.isAvailable = false;
    await product.save();
    
    // Reject other bids for this product
    await Bid.updateMany(
      {
        product: product._id,
        _id: { $ne: bid._id }
      },
      { status: "rejected" }
    );
    
    res.json({
      success: true,
      bid,
      message: "Bid accepted successfully"
    });
  } catch (error) {
    console.error("Accept bid error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// ========== NEW ENDPOINTS FOR RECYCLER DASHBOARD ==========
// Get recycler's bids (for dashboard)
// Update the /api/bids/my-bids endpoint to better populate data:
app.get("/api/bids/my-bids", authMiddleware, async (req, res) => {
  try {
    // Check if user is recycler
    if (req.user.role !== 'recycler') {
      return res.status(403).json({
        success: false,
        message: "Only recyclers can view their bids"
      });
    }
    
    console.log("🔍 Fetching bids for recycler:", req.user.id);
    
    // Get all bids for this recycler
    const bids = await Bid.find({ 
      bidder: req.user.id 
    })
    .populate({
      path: 'product',
      select: 'title description price category location image weight condition sellerName sellerPhone sellerWhatsApp',
      populate: {
        path: 'seller',
        select: 'name phone whatsapp email location'
      }
    })
    .sort({ createdAt: -1 });
    
    // Transform the data to ensure seller phone is accessible
    const transformedBids = bids.map(bid => {
      const bidObj = bid.toObject();
      
      // If product exists, ensure seller info is available
      if (bidObj.product) {
        // Use seller info from populated seller or from product fields
        bidObj.product.seller = bidObj.product.seller || {};
        bidObj.product.seller.phone = bidObj.product.seller.phone || bidObj.product.sellerPhone;
        bidObj.product.seller.whatsapp = bidObj.product.seller.whatsapp || bidObj.product.sellerWhatsApp;
        bidObj.product.seller.name = bidObj.product.seller.name || bidObj.product.sellerName;
      }
      
      return bidObj;
    });
    
    console.log(`✅ Found ${bids.length} bids for recycler`);
    
    res.json({
      success: true,
      bids: transformedBids,
      count: bids.length
    });
  } catch (error) {
    console.error("❌ Get my bids error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message
    });
  }
});

// Also update the /api/bids/recycler/all endpoint similarly
app.get("/api/bids/recycler/all", authMiddleware, async (req, res) => {
  try {
    // Check if user is recycler
    if (req.user.role !== 'recycler') {
      return res.status(403).json({
        success: false,
        message: "Only recyclers can view bids"
      });
    }
    
    const { status, pickupStatus } = req.query;
    let query = { bidder: req.user.id };
    
    if (status) query.status = status;
    if (pickupStatus) query.pickupStatus = pickupStatus;
    
    const bids = await Bid.find(query)
      .populate({
        path: 'product',
        select: 'title description price category location image weight condition sellerName sellerPhone sellerWhatsApp',
        populate: {
          path: 'seller',
          select: 'name phone whatsapp email location'
        }
      })
      .sort({ createdAt: -1 });
    
    // Transform data
    const transformedBids = bids.map(bid => {
      const bidObj = bid.toObject();
      
      if (bidObj.product) {
        bidObj.product.seller = bidObj.product.seller || {};
        bidObj.product.seller.phone = bidObj.product.seller.phone || bidObj.product.sellerPhone;
        bidObj.product.seller.whatsapp = bidObj.product.seller.whatsapp || bidObj.product.sellerWhatsApp;
        bidObj.product.seller.name = bidObj.product.seller.name || bidObj.product.sellerName;
      }
      
      return bidObj;
    });
    
    // Calculate stats
    const totalBids = await Bid.countDocuments({ bidder: req.user.id });
    const activeBids = await Bid.countDocuments({ 
      bidder: req.user.id,
      status: { $in: ["pending", "leading"] }
    });
    const acceptedBids = await Bid.countDocuments({ 
      bidder: req.user.id,
      status: "accepted"
    });
    const completedBids = await Bid.countDocuments({ 
      bidder: req.user.id,
      status: "completed"
    });
    const scheduledPickups = await Bid.countDocuments({ 
      bidder: req.user.id,
      pickupStatus: "scheduled"
    });
    
    res.json({
      success: true,
      bids: transformedBids,
      stats: {
        total: totalBids,
        active: activeBids,
        accepted: acceptedBids,
        completed: completedBids,
        scheduledPickups: scheduledPickups
      }
    });
  } catch (error) {
    console.error("Get recycler bids error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// Schedule pickup for a bid
app.put("/api/bids/:id/schedule-pickup", authMiddleware, async (req, res) => {
  try {
    console.log("📅 Schedule pickup request for bid:", req.params.id);
    
    const { pickupDate, pickupTime, pickupLocation, notes } = req.body;
    
    const bid = await Bid.findById(req.params.id)
      .populate('bidder', 'name phone email')
      .populate({
        path: 'product',
        populate: {
          path: 'seller',
          select: 'name phone whatsapp email'
        }
      });
    
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: "Bid not found"
      });
    }
    
    // Check if user is the bidder
    if (bid.bidder._id.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }
    
    if (bid.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: "Only accepted bids can be scheduled for pickup"
      });
    }
    
    // Format pickup date and time
    const scheduledDateTime = new Date(pickupDate);
    
    // Update bid
    bid.pickupDate = scheduledDateTime;
    bid.pickupTime = pickupTime;
    bid.pickupLocation = pickupLocation || bid.product?.location || "Seller's location";
    bid.pickupNotes = notes;
    bid.pickupStatus = "scheduled";
    bid.sellerContacted = true;
    bid.updatedAt = Date.now();
    
    await bid.save();
    
    // Get seller info for WhatsApp
    const seller = bid.product?.seller;
    const product = bid.product;
    
    // Generate WhatsApp URL
    let whatsappUrl = null;
    if (seller && seller.phone) {
      const sellerPhone = seller.whatsapp || seller.phone;
      const cleanPhone = sellerPhone.replace(/\D/g, '');
      
      const formattedDate = scheduledDateTime.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const message = `🚚 LoopCart Pickup Scheduled%0A%0A` +
        `Product: ${product?.title || 'Your Product'}%0A` +
        `Recycler: ${bid.bidderName}%0A` +
        `Recycler Phone: ${bid.bidderPhone || bid.bidder.phone}%0A` +
        `Pickup Date: ${formattedDate}%0A` +
        `Pickup Time: ${pickupTime}%0A` +
        `Pickup Location: ${pickupLocation || product?.location}%0A` +
        `Bid Amount: ₹${bid.amount}%0A` +
        `Notes: ${notes || 'None'}%0A%0A` +
        `Please confirm the pickup details. Thank you!`;
      
      whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;
    }
    
    res.json({
      success: true,
      message: "Pickup scheduled successfully",
      bid: bid,
      whatsappUrl: whatsappUrl
    });
    
  } catch (error) {
    console.error("❌ Schedule pickup error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message
    });
  }
});

// Complete pickup for a bid
app.put("/api/bids/:id/complete-pickup", authMiddleware, async (req, res) => {
  try {
    console.log("✅ Complete pickup request for bid:", req.params.id);
    
    const bid = await Bid.findById(req.params.id)
      .populate('bidder', 'name phone email')
      .populate({
        path: 'product',
        populate: {
          path: 'seller',
          select: 'name phone whatsapp email'
        }
      });
    
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: "Bid not found"
      });
    }
    
    // Check if user is the bidder
    if (bid.bidder._id.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }
    
    if (bid.pickupStatus !== "scheduled" && bid.pickupStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only scheduled pickups can be completed"
      });
    }
    
    // Update bid
    bid.pickupStatus = "completed";
    bid.status = "completed";
    bid.updatedAt = Date.now();
    
    await bid.save();
    
    // Update product status
    await Product.findByIdAndUpdate(bid.product._id, {
      status: "completed",
      isAvailable: false,
      updatedAt: Date.now()
    });
    
    // Get seller info for WhatsApp
    const seller = bid.product?.seller;
    let whatsappUrl = null;
    
    if (seller && seller.phone) {
      const sellerPhone = seller.whatsapp || seller.phone;
      const cleanPhone = sellerPhone.replace(/\D/g, '');
      
      const message = `✅ LoopCart Pickup Completed%0A%0A` +
        `Product: ${bid.product?.title || 'Your Product'}%0A` +
        `Recycler: ${bid.bidderName}%0A` +
        `Pickup Completed On: ${new Date().toLocaleDateString()}%0A` +
        `Amount: ₹${bid.amount}%0A%0A` +
        `Thank you for using LoopCart! Your item has been successfully recycled.`;
      
      whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;
    }
    
    res.json({
      success: true,
      message: "Pickup marked as completed",
      bid: bid,
      whatsappUrl: whatsappUrl
    });
    
  } catch (error) {
    console.error("❌ Complete pickup error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message
    });
  }
});

// Get recycler dashboard stats
app.get("/api/recycler/dashboard-stats", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'recycler') {
      return res.status(403).json({
        success: false,
        message: "Only recyclers can access dashboard"
      });
    }
    
    const user = await User.findById(req.user.id);
    
    // Get stats
    const activeBids = await Bid.countDocuments({
      bidder: req.user.id,
      status: { $in: ["pending", "leading"] }
    });
    
    const acceptedBids = await Bid.countDocuments({
      bidder: req.user.id,
      status: "accepted"
    });
    
    const scheduledPickups = await Bid.countDocuments({
      bidder: req.user.id,
      pickupStatus: "scheduled"
    });
    
    const completedPickups = await Bid.countDocuments({
      bidder: req.user.id,
      pickupStatus: "completed"
    });
    
    // Get recent bids
    const recentBids = await Bid.find({ bidder: req.user.id })
      .populate('product', 'title price category image')
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Get accepted products
    const acceptedProducts = await Bid.find({
      bidder: req.user.id,
      status: "accepted",
      pickupStatus: { $in: ["pending", "scheduled"] }
    })
    .populate('product', 'title price category image location')
    .sort({ createdAt: -1 })
    .limit(5);
    
    // Get pickup status
    const pickupStatus = await Bid.find({
      bidder: req.user.id,
      status: "accepted",
      pickupStatus: { $in: ["scheduled", "pending"] }
    })
    .populate('product', 'title price')
    .sort({ pickupDate: 1 })
    .limit(5);
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        whatsapp: user.whatsapp,
        location: user.location
      },
      stats: {
        activeBids,
        acceptedBids,
        scheduledPickups,
        completedPickups,
        totalRecycled: completedPickups
      },
      recentBids,
      acceptedProducts,
      pickupStatus
    });
  } catch (error) {
    console.error("Get recycler dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// ========== RECYCLER DASHBOARD ROUTES ==========
// Get recycler dashboard data
app.get("/api/recycler/dashboard", authMiddleware, async (req, res) => {
  try {
    // Check if user is recycler
    if (req.user.role !== 'recycler') {
      return res.status(403).json({
        success: false,
        message: "Only recyclers can access dashboard"
      });
    }
    
    const user = await User.findById(req.user.id);
    
    // Get stats
    const activeBids = await Bid.countDocuments({
      bidder: req.user.id,
      status: { $in: ["pending", "leading"] }
    });
    
    const acceptedBids = await Bid.countDocuments({
      bidder: req.user.id,
      status: "accepted"
    });
    
    const scheduledPickups = await Bid.countDocuments({
      bidder: req.user.id,
      pickupStatus: "scheduled"
    });
    
    const completedPickups = await Bid.countDocuments({
      bidder: req.user.id,
      pickupStatus: "completed"
    });
    
    // Get recent bids
    const recentBids = await Bid.find({ bidder: req.user.id })
      .populate('product', 'title price category image')
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Get accepted products
    const acceptedProducts = await Bid.find({
      bidder: req.user.id,
      status: "accepted",
      pickupStatus: { $in: ["pending", "scheduled"] }
    })
    .populate('product', 'title price category image location')
    .sort({ createdAt: -1 })
    .limit(5);
    
    // Get pickup status
    const pickupStatus = await Bid.find({
      bidder: req.user.id,
      status: "accepted",
      pickupStatus: { $in: ["scheduled", "pending"] }
    })
    .populate('product', 'title price')
    .sort({ pickupDate: 1 })
    .limit(5);
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        whatsapp: user.whatsapp,
        location: user.location
      },
      stats: {
        activeBids,
        acceptedBids,
        scheduledPickups,
        completedPickups,
        totalRecycled: completedPickups
      },
      recentBids,
      acceptedProducts,
      pickupStatus
    });
  } catch (error) {
    console.error("Get recycler dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// ========== WISHLIST ROUTES ==========
// Add to wishlist
app.post("/api/wishlist/:productId", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const product = await Product.findById(req.params.productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    // Initialize wishlist if not exists
    if (!user.wishlist) {
      user.wishlist = [];
    }
    
    // Check if already in wishlist
    if (user.wishlist.includes(req.params.productId)) {
      return res.status(400).json({
        success: false,
        message: "Product already in wishlist"
      });
    }
    
    // Add to wishlist
    user.wishlist.push(req.params.productId);
    await user.save();
    
    // Update product saves count
    product.saves = (product.saves || 0) + 1;
    await product.save();
    
    res.json({
      success: true,
      message: "Product added to wishlist"
    });
  } catch (error) {
    console.error("Add to wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// Get wishlist
app.get("/api/wishlist", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('wishlist');
    
    res.json({
      success: true,
      wishlist: user.wishlist || []
    });
  } catch (error) {
    console.error("Get wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// Remove from wishlist
app.delete("/api/wishlist/:productId", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.wishlist || !user.wishlist.includes(req.params.productId)) {
      return res.status(400).json({
        success: false,
        message: "Product not in wishlist"
      });
    }
    
    user.wishlist = user.wishlist.filter(
      id => id.toString() !== req.params.productId
    );
    await user.save();
    
    res.json({
      success: true,
      message: "Product removed from wishlist"
    });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// ========== SAVED PRODUCTS ROUTES ==========
// Save product
app.post("/api/save-product/:productId", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const product = await Product.findById(req.params.productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    if (!user.savedProducts) {
      user.savedProducts = [];
    }
    
    // Check if already saved
    const isAlreadySaved = user.savedProducts.some(
      item => item.productId.toString() === req.params.productId
    );
    
    if (isAlreadySaved) {
      return res.status(400).json({
        success: false,
        message: "Product already saved"
      });
    }
    
    // Add to saved products
    user.savedProducts.push({
      productId: product._id,
      title: product.title,
      price: product.price,
      image: product.image,
      category: product.category
    });
    await user.save();
    
    res.json({
      success: true,
      savedProducts: user.savedProducts,
      message: "Product saved successfully"
    });
  } catch (error) {
    console.error("Save product error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// Get saved products
app.get("/api/saved-products", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      savedProducts: user.savedProducts || []
    });
  } catch (error) {
    console.error("Get saved products error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// Remove saved product
app.delete("/api/saved-products/:productId", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.savedProducts) {
      return res.status(400).json({
        success: false,
        message: "No saved products"
      });
    }
    
    user.savedProducts = user.savedProducts.filter(
      item => item.productId.toString() !== req.params.productId
    );
    await user.save();
    
    res.json({
      success: true,
      savedProducts: user.savedProducts,
      message: "Product removed from saved list"
    });
  } catch (error) {
    console.error("Remove saved product error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// ========== CART ROUTES ==========
// Cart endpoints placeholder
app.get("/api/cart", (req, res) => {
  res.json({
    message: "Cart endpoint - to be implemented",
    endpoints: {
      getCart: "GET /api/cart",
      addToCart: "POST /api/cart/add",
      removeFromCart: "DELETE /api/cart/remove/:productId"
    }
  });
});

// ========== SEED DATA ==========
// Create sample products
app.post("/api/seed/products", async (req, res) => {
  try {
    // Get or create a seller
    let seller = await User.findOne({ email: "seller@loopcart.com" });
    if (!seller) {
      seller = new User({
        name: "LoopCart Seller",
        email: "seller@loopcart.com",
        password: await bcrypt.hash("seller123", 10),
        phone: "+91 9876543210",
        role: "seller",
        location: "Bangalore"
      });
      await seller.save();
    }
    
    const sampleProducts = [
      {
        title: "iPhone 12 Pro",
        description: "Like new iPhone 12 Pro with 256GB storage. Includes original box and accessories. Used for 6 months.",
        price: 45000,
        category: "electronics",
        location: "Delhi",
        image: "iphone12.jpg",
        condition: "excellent",
        seller: seller._id,
        sellerName: seller.name,
        sellerPhone: seller.phone,
        type: "sell",
        recommendedListing: "buyers",
        status: "active",
        isAvailable: true
      },
      {
        title: "Plastic Bottles",
        description: "Clean PET plastic bottles ready for recycling. Collection of 50 bottles in good condition.",
        price: 500,
        category: "plastic",
        location: "Bangalore",
        image: "plastic-bottles.jpg",
        condition: "Used - Good",
        seller: seller._id,
        sellerName: seller.name,
        sellerPhone: seller.phone,
        type: "recycle",
        recommendedListing: "recyclers",
        status: "active",
        biddingEnabled: true,
        isAvailable: true
      },
      {
        title: "Wooden Study Table",
        description: "Solid wooden study table in excellent condition. Perfect for home office or student use.",
        price: 3500,
        category: "furniture",
        location: "Mumbai",
        image: "study-table.jpg",
        condition: "good",
        seller: seller._id,
        sellerName: seller.name,
        sellerPhone: seller.phone,
        type: "sell",
        recommendedListing: "buyers",
        status: "active",
        isAvailable: true
      }
    ];
    
    const createdProducts = [];
    for (const productData of sampleProducts) {
      const product = new Product(productData);
      await product.save();
      createdProducts.push(product);
    }
    
    res.json({
      success: true,
      message: "Sample products created successfully",
      count: createdProducts.length,
      products: createdProducts
    });
  } catch (error) {
    console.error("Seed products error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// ==================== TEST ENDPOINTS FOR RECYCLER ====================
app.get("/api/test/recycler-dashboard", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'recycler') {
      return res.status(403).json({
        success: false,
        message: "Only recyclers can access this"
      });
    }
    
    // Get sample data
    const user = await User.findById(req.user.id);
    
    // Get active bids count
    const activeBids = await Bid.countDocuments({
      bidder: req.user.id,
      status: { $in: ["pending", "leading"] }
    });
    
    // Get accepted bids count
    const acceptedBids = await Bid.countDocuments({
      bidder: req.user.id,
      status: "accepted"
    });
    
    // Get scheduled pickups
    const scheduledPickups = await Bid.countDocuments({
      bidder: req.user.id,
      pickupStatus: "scheduled"
    });
    
    // Get completed pickups
    const completedPickups = await Bid.countDocuments({
      bidder: req.user.id,
      pickupStatus: "completed"
    });
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location
      },
      stats: {
        activeBids,
        acceptedBids,
        scheduledPickups,
        completedPickups
      },
      message: "Recycler dashboard test successful"
    });
    
  } catch (error) {
    console.error("Test recycler dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message
    });
  }
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found`
  });
});

// Catch-all route for any other requests
app.get("*", (req, res) => {
  // Check if it's an API request
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: `API endpoint ${req.path} not found`
    });
  }
  
  // Otherwise try to serve the requested file from public
  const requestedFile = req.path === '/' ? 'index.html' : req.path;
  const filePath = path.join(publicPath, requestedFile);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // Fallback to index.html
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send(`
        <html>
          <head><title>404 - Page Not Found</title></head>
          <body>
            <h1>404 - Home Page Not Found</h1>
            <p>index.html was not found in: <strong>${publicPath}</strong></p>
            <p>Make sure your HTML files are in the correct location.</p>
          </body>
        </html>
      `);
    }
  }
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving HTML files from: ${publicPath}`);
  console.log(`📁 Backend directory: ${__dirname}`);
  console.log(`\n🔗 Available endpoints:`);
  console.log(`   GET  /api/health - Health check`);
  console.log(`   GET  /api/test/recycle - Test recycle endpoint`);
  console.log(`   GET  /api/debug/products - Debug products`);
  console.log(`   GET  /api/products/recycle - Get recycle products ✓`);
  console.log(`   POST /api/seed/recycle-products - Seed recycle data`);
  console.log(`   GET  /api/products - Get all products`);
  console.log(`   POST /api/auth/login - Login`);
  console.log(`   POST /api/auth/signup - Signup`);
  console.log(`   GET  /api/auth/me - Get current user`);
  console.log(`   POST /api/bids/product/:id - Place bid`);
  console.log(`   GET  /api/bids/product/:id - Get bids`);
  console.log(`   GET  /api/recycler/dashboard - Recycler dashboard`);
  console.log(`\n📊 New Recycler Endpoints:`);
  console.log(`   GET  /api/bids/my-bids - Get recycler's bids ✓`);
  console.log(`   GET  /api/bids/recycler/all - Get all bids with stats ✓`);
  console.log(`   PUT  /api/bids/:id/schedule-pickup - Schedule pickup ✓`);
  console.log(`   PUT  /api/bids/:id/complete-pickup - Complete pickup ✓`);
  console.log(`   GET  /api/recycler/dashboard-stats - Dashboard stats ✓`);
  console.log(`\n🌐 Available pages:`);
  Object.keys(routes).forEach(route => {
    console.log(`   http://localhost:${PORT}${route}`);
  });
  console.log(`\n🔧 API endpoints available at http://localhost:${PORT}/api/`);
  console.log(`\n📝 Important Seller Endpoints:`);
  console.log(`   POST /api/products - Create product (with form-data)`);
  console.log(`   GET /api/my-products - Get seller's products`);
  console.log(`   POST /api/ai/enhance - AI enhancement for products`);
  console.log(`   GET /api/seller/dashboard - Seller dashboard data`);
});