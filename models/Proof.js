// models/Proof.js
const mongoose = require("mongoose");

const proofSchema = new mongoose.Schema({
  transactionId: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true }, // bank_transfer, upi, cash, etc.
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  proofFile: { type: String, required: true },
  originalFilename: String,
  status: { type: String, default: "pending" }, // pending, verified, rejected
  verifiedBy: String,
  verifiedAt: Date,
  verificationNotes: String,
  rejectedBy: String,
  rejectedAt: Date,
  rejectionReason: String
}, { timestamps: true });

module.exports = mongoose.model("Proof", proofSchema);