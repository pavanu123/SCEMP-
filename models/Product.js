const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    image: String,
    images: [String],
    weight: String,
    condition: {
      type: String,
      enum: ["New", "Used - Like New", "Used - Good", "Refurbished"],
      default: "Used - Good",
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    sellerName: String,
    sellerPhone: String,
    sellerWhatsApp: String,
    quantity: {
      type: Number,
      default: 1,
    },
    pricePerUnit: Number,
    totalPrice: Number,
    type: {
      type: String,
      enum: ["sell", "recycle"],
      default: "sell",
    },
    status: {
      type: String,
      enum: ["active", "sold", "pending", "expired"],
      default: "active",
    },
    recommendedListing: {
      type: String,
      enum: ["buyers", "recyclers", "both"],
      default: "buyers",
    },
    suggestedCategory: String,
    views: {
      type: Number,
      default: 0,
    },
    saves: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);