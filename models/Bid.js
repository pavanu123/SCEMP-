const bidSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  bidder: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bidderName: { type: String, required: true },
  bidderEmail: { type: String, required: true },
  bidderPhone: String, // Add this field
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
    enum: ["pending", "scheduled", "completed", "cancelled", "failed"], 
    default: "pending" 
  },
  pickupDate: Date,
  pickupTime: String,
  pickupLocation: String,
  pickupNotes: String, // Add this field
  sellerContacted: { type: Boolean, default: false },
  whatsappMessageSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});