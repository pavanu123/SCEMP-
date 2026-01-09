const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Proof = require("../models/Proof");

// ==================== MULTER CONFIGURATION ====================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '../uploads/proofs');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image and PDF files are allowed!'));
  }
});

// =============================
// 📤 Upload payment proof
// =============================
router.post("/upload", upload.single('proof'), async (req, res) => {
  try {
    const { transactionId, amount, paymentMethod, userId, userName } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Proof file is required"
      });
    }

    const proof = new Proof({
      transactionId,
      amount,
      paymentMethod,
      userId,
      userName,
      proofFile: req.file.filename,
      originalFilename: req.file.originalname,
      status: "pending"
    });

    await proof.save();
    
    res.json({
      success: true,
      message: "Payment proof uploaded successfully",
      proof
    });
  } catch (err) {
    console.error("❌ Error uploading proof:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// =============================
// 📋 Get all proofs
// =============================
router.get("/", async (req, res) => {
  try {
    const proofs = await Proof.find()
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      proofs,
      count: proofs.length
    });
  } catch (err) {
    console.error("❌ Error fetching proofs:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// =============================
// 👤 Get user's proofs
// =============================
router.get("/user/:userId", async (req, res) => {
  try {
    const proofs = await Proof.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      proofs,
      count: proofs.length
    });
  } catch (err) {
    console.error("❌ Error fetching user proofs:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// =============================
// 🔍 Get proof by ID
// =============================
router.get("/:id", async (req, res) => {
  try {
    const proof = await Proof.findById(req.params.id);
    
    if (!proof) {
      return res.status(404).json({
        success: false,
        message: "Proof not found"
      });
    }
    
    res.json({
      success: true,
      proof
    });
  } catch (err) {
    console.error("❌ Error fetching proof:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// =============================
// ✅ Verify/approve proof
// =============================
router.put("/:id/verify", async (req, res) => {
  try {
    const { verifiedBy, notes } = req.body;
    
    const proof = await Proof.findByIdAndUpdate(
      req.params.id,
      {
        status: "verified",
        verifiedBy,
        verifiedAt: new Date(),
        verificationNotes: notes
      },
      { new: true }
    );
    
    if (!proof) {
      return res.status(404).json({
        success: false,
        message: "Proof not found"
      });
    }
    
    res.json({
      success: true,
      message: "Proof verified successfully",
      proof
    });
  } catch (err) {
    console.error("❌ Error verifying proof:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// =============================
// ❌ Reject proof
// =============================
router.put("/:id/reject", async (req, res) => {
  try {
    const { rejectedBy, reason } = req.body;
    
    const proof = await Proof.findByIdAndUpdate(
      req.params.id,
      {
        status: "rejected",
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason: reason
      },
      { new: true }
    );
    
    if (!proof) {
      return res.status(404).json({
        success: false,
        message: "Proof not found"
      });
    }
    
    res.json({
      success: true,
      message: "Proof rejected",
      proof
    });
  } catch (err) {
    console.error("❌ Error rejecting proof:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// =============================
// 📊 Get proof statistics
// =============================
router.get("/stats/overview", async (req, res) => {
  try {
    const totalProofs = await Proof.countDocuments();
    const pendingProofs = await Proof.countDocuments({ status: "pending" });
    const verifiedProofs = await Proof.countDocuments({ status: "verified" });
    const rejectedProofs = await Proof.countDocuments({ status: "rejected" });
    
    // Calculate total amount
    const totalAmountResult = await Proof.aggregate([
      { $match: { status: "verified" } },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
    ]);
    
    const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;
    
    res.json({
      success: true,
      stats: {
        totalProofs,
        pendingProofs,
        verifiedProofs,
        rejectedProofs,
        totalAmount
      }
    });
  } catch (err) {
    console.error("❌ Error fetching proof stats:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// =============================
// 🗑️ Delete proof
// =============================
router.delete("/:id", async (req, res) => {
  try {
    const proof = await Proof.findById(req.params.id);
    
    if (!proof) {
      return res.status(404).json({
        success: false,
        message: "Proof not found"
      });
    }
    
    // Delete the file from filesystem
    const filePath = path.join(__dirname, '../uploads/proofs', proof.proofFile);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await proof.deleteOne();
    
    res.json({
      success: true,
      message: "Proof deleted successfully"
    });
  } catch (err) {
    console.error("❌ Error deleting proof:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;