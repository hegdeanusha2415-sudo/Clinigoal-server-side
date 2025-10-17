const express = require("express");
const Admin = require("./models/Admin");
const nodemailer = require("nodemailer");
const router = express.Router();

// Send OTP
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(404).json({ message: "Admin not found" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  admin.otp = otp;
  admin.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 min expiry
  await admin.save();

  // send OTP via email (nodemailer)
  // ...

  res.json({ message: "OTP sent to your email" });
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin || admin.otp !== otp || Date.now() > admin.otpExpiry)
    return res.status(400).json({ message: "Invalid or expired OTP" });

  res.json({ message: "OTP verified" });
});

// Reset Password
router.post("/reset", async (req, res) => {
  const { email, newPassword } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(404).json({ message: "Admin not found" });

  admin.password = newPassword; // You should hash it in production
  admin.otp = null;
  admin.otpExpiry = null;
  await admin.save();

  res.json({ message: "Password reset successfully" });
});

module.exports = router;
