const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'No token, authorization denied' 
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'loopcartsecret');
    
    // Add user from payload
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ 
      success: false,
      message: 'Token is not valid' 
    });
  }
};

// Admin middleware
exports.adminAuth = function(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Admin access required' 
    });
  }
  next();
};

// Seller middleware
exports.sellerAuth = function(req, res, next) {
  if (req.user.role !== 'seller') {
    return res.status(403).json({ 
      success: false,
      message: 'Seller access required' 
    });
  }
  next();
};

// Buyer middleware
exports.buyerAuth = function(req, res, next) {
  if (req.user.role !== 'buyer') {
    return res.status(403).json({ 
      success: false,
      message: 'Buyer access required' 
    });
  }
  next();
};