const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  amount: { type: Number, required: true },
  paymentId: { type: String }, // Payment gateway ID (e.g., Razorpay)
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", paymentSchema);
