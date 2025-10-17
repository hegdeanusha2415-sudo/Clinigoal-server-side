require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const Razorpay = require("razorpay");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5000;

// ----------------- MIDDLEWARE -----------------
app.use(cors());
app.use(bodyParser.json());

// ----------------- MONGODB -----------------
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ----------------- RAZORPAY -----------------
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ----------------- SCHEMAS -----------------
const courseSchema = new mongoose.Schema({
  courseName: String,
  videos: [{ _id: String, url: String }],
  notes: [String],
  quizzes: [String],
});
const Course = mongoose.model("Course", courseSchema);

const paymentSchema = new mongoose.Schema({
  userId: String,
  courseId: String,
  amount: Number,
  status: { type: String, default: "Pending" },
  paymentId: String,
  date: { type: Date, default: Date.now },
});
const Payment = mongoose.model("Payment", paymentSchema);

const reviewSchema = new mongoose.Schema({
  name: String,
  text: String,
  rating: Number,
  date: { type: Date, default: Date.now },
});
const Review = mongoose.model("Review", reviewSchema);

const progressSchema = new mongoose.Schema({
  userId: String,
  courseId: String,
  videosWatched: [String],
  notesViewed: [String],
  assignmentsSubmitted: [{ assignmentId: String, submitted: Boolean }],
  quizAttempts: [{ quizId: String, score: Number }],
  certificateGenerated: { type: Boolean, default: false },
});
const UserProgress = mongoose.model("UserProgress", progressSchema);

// --- Admin Schema for OTP ---
const adminSchema = new mongoose.Schema({
  email: String,
  password: String,
  otp: String,
  otpExpiry: Date,
});
const Admin = mongoose.model("Admin", adminSchema);

// ----------------- HELPERS -----------------
const checkPaymentApproved = async (userId, courseId) => {
  const payment = await Payment.findOne({ userId, courseId, status: "Approved" });
  if (!payment) throw new Error("Payment not approved yet");
};

// ----------------- OTP SETUP -----------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // from .env
    pass: process.env.EMAIL_PASS, // app password
  },
});

// -------- ADMIN FORGOT PASSWORD (OTP FLOW) --------

// 1️⃣ Send OTP
app.post("/api/admin/forgot-password/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    admin.otp = otp;
    admin.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 min expiry
    await admin.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Clinigoal Admin OTP Verification",
      text: `Your OTP for password reset is ${otp}. It will expire in 10 minutes.`,
    });

    res.json({ message: "OTP sent successfully!" });
  } catch (err) {
    console.error("OTP error:", err);
    res.status(500).json({ message: "Error sending OTP" });
  }
});

// 2️⃣ Verify OTP
app.post("/api/admin/forgot-password/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin || admin.otp !== otp || Date.now() > admin.otpExpiry)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error verifying OTP" });
  }
});

// 3️⃣ Reset Password
app.post("/api/admin/forgot-password/reset", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    admin.password = newPassword; // ⚠️ Hash this in production
    admin.otp = null;
    admin.otpExpiry = null;
    await admin.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error resetting password" });
  }
});

// ----------------- COURSE ROUTES -----------------
app.get("/api/courses", async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/courses", async (req, res) => {
  try {
    const course = new Course(req.body);
    await course.save();
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- PAYMENT ROUTES -----------------
app.post("/api/payments/create-order", async (req, res) => {
  const { amount } = req.body;
  try {
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });
    res.json({ orderId: order.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payments", async (req, res) => {
  const { userId, courseId, amount, paymentId } = req.body;
  try {
    const payment = new Payment({ userId, courseId, amount, paymentId, status: "Pending" });
    await payment.save();
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payments/approve", async (req, res) => {
  const { paymentId } = req.body;
  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    payment.status = "Approved";
    await payment.save();
    res.json({ message: "Payment approved", payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/payments", async (req, res) => {
  const { userId } = req.query;
  try {
    const payments = await Payment.find({ userId, status: "Approved" });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/payments/all", async (req, res) => {
  try {
    const payments = await Payment.find().sort({ date: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- REVIEWS -----------------
app.get("/api/reviews", async (req, res) => {
  try {
    const reviews = await Review.find().sort({ date: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/reviews", async (req, res) => {
  try {
    const review = new Review(req.body);
    await review.save();
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- USER PROGRESS -----------------
app.get("/api/progress", async (req, res) => {
  const { userId, courseId } = req.query;
  try {
    let progress = await UserProgress.findOne({ userId, courseId });
    if (!progress) progress = new UserProgress({ userId, courseId });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/progress/video", async (req, res) => {
  const { userId, courseId, videoId } = req.body;
  try {
    await checkPaymentApproved(userId, courseId);
    let progress = await UserProgress.findOne({ userId, courseId });
    if (!progress) progress = new UserProgress({ userId, courseId });
    if (!progress.videosWatched.includes(videoId)) progress.videosWatched.push(videoId);
    await progress.save();
    res.json(progress);
  } catch (err) {
    res.status(err.message === "Payment not approved yet" ? 403 : 500).json({ error: err.message });
  }
});

// ----------------- START SERVER -----------------
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
