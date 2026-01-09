const express = require('express');
const router = express.Router();
const Seller = require('../models/Seller');
const User = require('../models/User');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// @route   POST /api/sellers/register
// @desc    Register as seller (update existing user)
router.post('/register', auth, async (req, res) => {
  try {
    const {
      businessName,
      businessAddress,
      businessPhone,
      gstNumber,
      panNumber,
      bankDetails
    } = req.body;

    // Check if already registered as seller
    let seller = await Seller.findOne({ user: req.user.id });
    if (seller) {
      return res.status(400).json({
        success: false,
        message: 'Already registered as seller'
      });
    }

    // Update user role
    await User.findByIdAndUpdate(req.user.id, { role: 'seller' });

    // Create seller profile
    seller = new Seller({
      user: req.user.id,
      businessName,
      businessAddress,
      businessPhone,
      businessEmail: req.user.email,
      gstNumber,
      panNumber,
      bankDetails
    });

    await seller.save();

    res.json({
      success: true,
      seller,
      message: 'Seller registration successful'
    });
  } catch (error) {
    console.error('Seller register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/sellers/profile
// @desc    Get seller profile
router.get('/profile', auth, async (req, res) => {
  try {
    const seller = await Seller.findOne({ user: req.user.id })
      .populate('user', 'name email phone');

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found'
      });
    }

    res.json({
      success: true,
      seller
    });
  } catch (error) {
    console.error('Get seller profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/sellers/profile
// @desc    Update seller profile
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = req.body;
    
    const seller = await Seller.findOneAndUpdate(
      { user: req.user.id },
      { $set: updates },
      { new: true }
    ).populate('user', 'name email phone');

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found'
      });
    }

    res.json({
      success: true,
      seller,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update seller profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/sellers/:sellerId
// @desc    Get public seller info
router.get('/:sellerId', async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.sellerId)
      .populate('user', 'name phone')
      .select('-bankDetails -gstNumber -panNumber');

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }

    // Get seller's products
    const user = await User.findById(seller.user._id);
    const products = await Product.find({ seller: user._id, status: 'active' })
      .limit(20);

    // Calculate average rating (simplified)
    const allProducts = await Product.find({ seller: user._id });
    const totalRating = allProducts.reduce((sum, p) => sum + (p.rating || 0), 0);
    const avgRating = allProducts.length > 0 ? totalRating / allProducts.length : 0;

    res.json({
      success: true,
      seller: {
        ...seller.toObject(),
        rating: avgRating,
        totalProducts: products.length
      },
      products
    });
  } catch (error) {
    console.error('Get seller error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/sellers/:sellerId/products
// @desc    Get seller's products
router.get('/:sellerId/products', async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.sellerId);
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }

    const products = await Product.find({ 
      seller: seller.user,
      status: 'active' 
    })
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Get seller products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/sellers/:sellerId/stats
// @desc    Get seller statistics
router.get('/:sellerId/stats', auth, async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.sellerId);
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }

    // Check authorization
    if (seller.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Get products count
    const totalProducts = await Product.countDocuments({ 
      seller: seller.user 
    });

    const activeProducts = await Product.countDocuments({ 
      seller: seller.user,
      status: 'active' 
    });

    const soldProducts = await Product.countDocuments({ 
      seller: seller.user,
      status: 'sold' 
    });

    // Calculate earnings (simplified - sum of sold product prices)
    const soldProductsData = await Product.find({ 
      seller: seller.user,
      status: 'sold' 
    });
    
    const totalEarnings = soldProductsData.reduce((sum, product) => {
      return sum + (product.totalPrice || product.price || 0);
    }, 0);

    // Update seller stats
    seller.totalSales = soldProducts;
    seller.totalEarnings = totalEarnings;
    await seller.save();

    res.json({
      success: true,
      stats: {
        totalProducts,
        activeProducts,
        soldProducts,
        totalEarnings,
        rating: seller.rating,
        verified: seller.verified
      }
    });
  } catch (error) {
    console.error('Get seller stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/sellers/upload-documents
// @desc    Upload verification documents
router.post('/upload-documents', auth, async (req, res) => {
  try {
    const { documents } = req.body; // Array of document URLs

    const seller = await Seller.findOne({ user: req.user.id });
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found'
      });
    }

    seller.verificationDocuments = documents;
    await seller.save();

    res.json({
      success: true,
      message: 'Documents uploaded successfully'
    });
  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;