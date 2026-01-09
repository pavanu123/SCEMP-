const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');

// @route   GET /api/listings/search
// @desc    Search listings
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const {
      q,
      category,
      minPrice,
      maxPrice,
      condition,
      location,
      sortBy,
      page = 1,
      limit = 20
    } = req.query;

    let query = { status: 'active' };

    // Search query
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    // Filters
    if (category) query.category = category;
    if (condition) query.condition = condition;
    if (location) query['location.city'] = { $regex: location, $options: 'i' };

    // Price range
    if (minPrice || maxPrice) {
      query.currentPrice = {};
      if (minPrice) query.currentPrice.$gte = Number(minPrice);
      if (maxPrice) query.currentPrice.$lte = Number(maxPrice);
    }

    // Sort options
    let sort = {};
    switch (sortBy) {
      case 'price_low':
        sort.currentPrice = 1;
        break;
      case 'price_high':
        sort.currentPrice = -1;
        break;
      case 'ending_soon':
        sort.auctionEnd = 1;
        break;
      case 'newest':
        sort.createdAt = -1;
        break;
      default:
        sort.createdAt = -1;
    }

    const skip = (page - 1) * limit;

    const listings = await Listing.find(query)
      .populate('seller', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Listing.countDocuments(query);

    res.json({
      success: true,
      listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/listings/:id/view
// @desc    Increment listing views
// @access  Public
router.put('/:id/view', async (req, res) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!listing) {
      return res.status(404).json({ 
        success: false, 
        message: 'Listing not found' 
      });
    }

    res.json({ 
      success: true, 
      views: listing.views 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/listings/user/:userId
// @desc    Get listings by user
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = { seller: req.params.userId };

    if (status) query.status = status;
    if (type) query.auctionType = type;

    const listings = await Listing.find(query)
      .populate('seller', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      listings 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/listings/:id/status
// @desc    Update listing status
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ 
        success: false, 
        message: 'Listing not found' 
      });
    }

    // Check ownership
    if (listing.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    listing.status = status;
    await listing.save();

    res.json({ 
      success: true, 
      listing,
      message: 'Listing status updated' 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/listings/ending-soon
// @desc    Get listings ending soon
// @access  Public
router.get('/ending-soon', async (req, res) => {
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours

    const listings = await Listing.find({
      status: 'active',
      auctionEnd: { $gte: now, $lte: soon }
    })
      .populate('seller', 'name avatar')
      .sort({ auctionEnd: 1 })
      .limit(20);

    res.json({ 
      success: true, 
      listings 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/listings/featured
// @desc    Get featured listings
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const listings = await Listing.aggregate([
      { $match: { status: 'active' } },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $multiply: ['$views', 0.1] },
              { $multiply: ['$watchlistCount', 1] },
              { $multiply: ['$bidCount', 2] }
            ]
          }
        }
      },
      { $sort: { engagementScore: -1 } },
      { $limit: 10 }
    ]);

    // Populate seller info
    await Listing.populate(listings, {
      path: 'seller',
      select: 'name avatar'
    });

    res.json({ 
      success: true, 
      listings 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;