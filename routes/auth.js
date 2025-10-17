import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import User from "../models/User.js";

dotenv.config();

const router = express.Router();

// ================== In-memory OTP store ==================
const otpStore = {}; // ⚠️ Temporary store — can later move to Redis or DB for persistence

// ================== Helper: Email Transporter ==================
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
  } else {
    console.log("📧 Email transporter ready — OTP emails can be sent");
  }
});

// ================== REGISTER ==================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, avatarUrl } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({ name, email, passwordHash, avatarUrl });
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// ================== LOGIN ==================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Missing email or password" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid credentials (email)" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials (password)" });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

// ================== SEND OTP ==================
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User with this email not found" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes validity
    };

    const mailOptions = {
      from: `"Clinigoal Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔐 Clinigoal Password Reset OTP",
      html: `
        <div style="font-family:Arial, sans-serif; background:#f8f9fa; padding:20px; border-radius:8px;">
          <h2 style="color:#0a58ca;">Password Reset Request</h2>
          <p>Hello ${user.name || "User"},</p>
          <p>Your OTP for password reset is:</p>
          <h1 style="color:#0a58ca; font-size:32px; letter-spacing:3px;">${otp}</h1>
          <p>This OTP will expire in <b>5 minutes</b>.</p>
          <p>If you didn’t request this, you can safely ignore this email.</p>
          <p style="margin-top:20px;">— Clinigoal Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent successfully to ${email}`);

    res.json({ message: "OTP sent successfully to your email" });
  } catch (err) {
    console.error("❌ OTP Send Error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

// ================== RESET PASSWORD ==================
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const record = otpStore[email];
    if (!record) return res.status(400).json({ message: "No OTP sent" });
    if (Date.now() > record.expiresAt)
      return res.status(400).json({ message: "OTP expired" });
    if (parseInt(otp) !== record.otp)
      return res.status(400).json({ message: "Invalid OTP" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.updateOne({ email }, { $set: { passwordHash: hashedPassword } });

    delete otpStore[email]; // ✅ cleanup after successful reset

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Password reset failed" });
  }
});

export default router;
