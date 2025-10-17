const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order
router.post("/create-order", async (req, res) => {
  const { amount, courseId, userId } = req.body;
  try {
    const options = {
      amount: amount * 100, // in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
