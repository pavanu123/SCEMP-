const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// @route   GET /api/products
// @desc    Get all products with filters
router.get('/', async (req, res) => {
  try {
    const {
      type,
      category,
      minPrice,
      maxPrice,
      location,
      condition,
      sortBy,
      page = 1,
      limit = 20
    } = req.query;

    let query = { status: 'active' };

    // Apply filters
    if (type) query.type = type;
    if (category) query.category = category;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (condition) query.condition = condition;
    
    // Price filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Sort options
    let sort = {};
    switch (sortBy) {
      case 'price_low':
        sort.price = 1;
        break;
      case 'price_high':
        sort.price = -1;
        break;
      case 'newest':
        sort.createdAt = -1;
        break;
      case 'popular':
        sort.views = -1;
        break;
      default:
        sort.createdAt = -1;
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .populate('seller', 'name phone')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/products/recycle
// @desc    Get recyclable products
router.get('/recycle', async (req, res) => {
  try {
    const products = await Product.find({
      $or: [
        { type: 'recycle' },
        { 
          category: {
            $in: [
              'Plastic Materials', 'Metal & Scrap', 'Paper & Cardboard',
              'Electronics & E-waste', 'Glass Materials', 'Organic Waste',
              'Textiles & Fabric', 'Construction Waste'
            ]
          }
        }
      ],
      status: 'active'
    })
    .populate('seller', 'name phone')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Get recycle products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name phone');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment views
    product.views += 1;
    await product.save();

    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/products
// @desc    Create new product
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      category,
      location,
      images,
      weight,
      condition,
      quantity,
      pricePerUnit,
      type,
      recommendedListing,
      suggestedCategory
    } = req.body;

    // Get user info
    const user = await User.findById(req.user.id);
    
    // Calculate total price
    const qty = quantity || 1;
    const unitPrice = pricePerUnit || price;
    const totalPrice = qty * unitPrice;

    const product = new Product({
      title,
      description,
      price: totalPrice,
      category,
      location,
      images: images || [],
      weight,
      condition: condition || 'Used - Good',
      seller: req.user.id,
      sellerName: user.name,
      sellerPhone: user.phone,
      quantity: qty,
      pricePerUnit: unitPrice,
      totalPrice,
      type: type || 'sell',
      recommendedListing: recommendedListing || 'buyers',
      suggestedCategory,
      status: 'active'
    });

    await product.save();

    res.json({
      success: true,
      product,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
router.put('/:id', auth, async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check ownership
    if (product.seller.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const updates = req.body;
    
    // Recalculate total price if quantity or pricePerUnit changes
    if (updates.quantity || updates.pricePerUnit) {
      const qty = updates.quantity || product.quantity;
      const unitPrice = updates.pricePerUnit || product.pricePerUnit;
      updates.totalPrice = qty * unitPrice;
      updates.price = updates.totalPrice;
    }

    product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );

    res.json({
      success: true,
      product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check ownership
    if (product.seller.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await product.remove();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/products/seller/:sellerId
// @desc    Get products by seller
router.get('/seller/:sellerId', async (req, res) => {
  try {
    const products = await Product.find({ seller: req.params.sellerId })
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

module.exports = router;