const express = require('express');
const router = express.Router();
const Bid = require('../models/Bid');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST /api/bids/product/:productId
// @desc    Place a bid on product
router.post('/product/:productId', async (req, res) => {
  try {
    const { bidderName, bidderEmail, amount, recycler } = req.body;

    // Check if product exists
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if bid already exists from this email
    const existingBid = await Bid.findOne({
      product: req.params.productId,
      bidderEmail
    });

    if (existingBid) {
      return res.status(400).json({
        success: false,
        message: 'You have already placed a bid on this product'
      });
    }

    // Check if bid amount is valid
    if (product.type === 'recycle' && amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Bid amount must be greater than 0'
      });
    }

    // Create bid
    const bid = new Bid({
      product: req.params.productId,
      bidderName,
      bidderEmail,
      recycler: recycler || bidderName,
      amount,
      status: 'leading',
      bidTime: new Date()
    });

    await bid.save();

    res.json({
      success: true,
      bid,
      message: 'Bid placed successfully'
    });
  } catch (error) {
    console.error('Place bid error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/bids/product/:productId
// @desc    Get all bids for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const bids = await Bid.find({ product: req.params.productId })
      .sort({ amount: -1, bidTime: 1 });

    res.json({
      success: true,
      bids
    });
  } catch (error) {
    console.error('Get product bids error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/bids/recycler/:email/active
// @desc    Get active bids for recycler
router.get('/recycler/:email/active', async (req, res) => {
  try {
    const bids = await Bid.find({
      bidderEmail: req.params.email,
      status: 'leading'
    })
    .populate('product')
    .sort({ bidTime: -1 });

    res.json({
      success: true,
      bids,
      count: bids.length
    });
  } catch (error) {
    console.error('Get active bids error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/bids/recycler/:email/accepted
// @desc    Get accepted bids for recycler
router.get('/recycler/:email/accepted', async (req, res) => {
  try {
    const bids = await Bid.find({
      bidderEmail: req.params.email,
      status: 'accepted'
    })
    .populate('product')
    .sort({ bidTime: -1 });

    res.json({
      success: true,
      bids,
      count: bids.length
    });
  } catch (error) {
    console.error('Get accepted bids error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/bids/:bidId/accept
// @desc    Accept a bid (seller only)
router.put('/:bidId/accept', auth, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.bidId).populate('product');
    
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    // Check if user is the seller
    const product = await Product.findById(bid.product._id);
    if (product.seller.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Update bid status
    bid.status = 'accepted';
    bid.pickupStatus = 'pending';
    await bid.save();

    // Update product status
    product.status = 'sold';
    await product.save();

    // Reject other bids
    await Bid.updateMany(
      {
        product: bid.product._id,
        _id: { $ne: bid._id }
      },
      { status: 'rejected' }
    );

    res.json({
      success: true,
      bid,
      message: 'Bid accepted successfully'
    });
  } catch (error) {
    console.error('Accept bid error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/bids/:bidId/schedule-pickup
// @desc    Schedule pickup for accepted bid
router.put('/:bidId/schedule-pickup', async (req, res) => {
  try {
    const { pickupLocation, pickupDate, pickupTime } = req.body;

    const bid = await Bid.findById(req.params.bidId);
    
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    if (bid.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Only accepted bids can schedule pickup'
      });
    }

    // Create pickup datetime
    const scheduledDateTime = new Date(`${pickupDate}T${pickupTime}`);
    
    bid.pickupLocation = pickupLocation;
    bid.pickupDate = scheduledDateTime;
    bid.pickupStatus = 'scheduled';
    bid.sellerContacted = true;
    await bid.save();

    // Get product for seller contact
    const product = await Product.findById(bid.product);
    
    // Generate WhatsApp message
    const sellerPhone = product.sellerPhone || product.sellerWhatsApp;
    const formattedDate = scheduledDateTime.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = scheduledDateTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const whatsappMessage = `🚚 LoopCart Pickup Scheduled%0A%0A` +
      `Product: ${product.title}%0A` +
      `Recycler: ${bid.bidderName}%0A` +
      `Pickup Date: ${formattedDate}%0A` +
      `Pickup Time: ${formattedTime}%0A` +
      `Pickup Location: ${pickupLocation}%0A` +
      `Bid Amount: ₹${bid.amount}%0A%0A` +
      `Please confirm the pickup details. Thank you!`;

    const whatsappUrl = `https://wa.me/${sellerPhone}?text=${whatsappMessage}`;

    res.json({
      success: true,
      bid,
      whatsappUrl,
      message: 'Pickup scheduled successfully'
    });
  } catch (error) {
    console.error('Schedule pickup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/bids/recycler/:email/stats
// @desc    Get recycler stats
router.get('/recycler/:email/stats', async (req, res) => {
  try {
    const activeBids = await Bid.countDocuments({
      bidderEmail: req.params.email,
      status: 'leading'
    });

    const acceptedBids = await Bid.countDocuments({
      bidderEmail: req.params.email,
      status: 'accepted'
    });

    const scheduledPickups = await Bid.countDocuments({
      bidderEmail: req.params.email,
      status: 'accepted',
      pickupStatus: 'scheduled'
    });

    const completedPickups = await Bid.countDocuments({
      bidderEmail: req.params.email,
      pickupStatus: 'completed'
    });

    res.json({
      success: true,
      stats: {
        activeBids,
        acceptedBids,
        scheduledPickups,
        completedPickups,
        totalRecycled: completedPickups
      }
    });
  } catch (error) {
    console.error('Get recycler stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/bids/seller/:sellerId
// @desc    Get bids for seller's products
router.get('/seller/:sellerId', auth, async (req, res) => {
  try {
    // Get seller's products
    const products = await Product.find({ seller: req.params.sellerId });
    const productIds = products.map(p => p._id);

    const bids = await Bid.find({ product: { $in: productIds } })
      .populate('product', 'title price')
      .sort({ bidTime: -1 });

    res.json({
      success: true,
      bids
    });
  } catch (error) {
    console.error('Get seller bids error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;