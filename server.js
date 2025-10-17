require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const Razorpay = require("razorpay");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const multer = require("multer"); // ✅ Added for photo upload

const app = express();
const PORT = process.env.PORT || 5000;

// ----------------- MIDDLEWARE -----------------
app.use(
  cors({
    origin: [
      "https://clinigoal-client-side.vercel.app",
      "http://localhost:3000",
    ],
    credentials: true,
  })
);



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ----------------- MONGODB -----------------
mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/clinigoal", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ----------------- RAZORPAY -----------------
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_dummykey",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "dummysecret",
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

// --- Admin Schema ---
const adminSchema = new mongoose.Schema({
  email: String,
  password: String,
  otp: String,
  otpExpiry: Date,
});
const Admin = mongoose.model("Admin", adminSchema);

// --- User Schema ---
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  otp: String,
  otpExpiry: Date,
  profilePhoto: { type: String, default: "" }, // ✅ Profile photo (Base64)
});
const User = mongoose.model("User", userSchema);

// ----------------- HELPERS -----------------
const checkPaymentApproved = async (userId, courseId) => {
  const payment = await Payment.findOne({ userId, courseId, status: "Approved" });
  if (!payment) throw new Error("Payment not approved yet");
};

// ----------------- NODEMAILER SETUP -----------------
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || "youremail@gmail.com",
    pass: process.env.EMAIL_PASS || "yourapppassword",
  },
});

// ✅ Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
  } else {
    console.log("📧 Email transporter ready to send messages");
  }
});

// ----------------- MULTER CONFIG -----------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ----------------- USER AUTH ROUTES -----------------

// 1️⃣ Register
app.post("/api/user/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashed });
    await newUser.save();

    res.json({ success: true, message: "Registration successful" });
  } catch (err) {
    res.status(500).json({ message: "Error during registration" });
  }
});

// 2️⃣ Login
app.post("/api/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    res.json({ success: true, message: "Login successful", user });
  } catch (err) {
    res.status(500).json({ message: "Error during authentication" });
  }
});

// 3️⃣ Forgot Password (Send OTP) — Updated to real email sending
app.post("/api/forgot-password/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    const mailOptions = {
      from: `"Clinigoal Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔐 Clinigoal Password Reset OTP",
      html: `
        <div style="font-family:Arial, sans-serif; padding:20px; border-radius:8px; background:#f8f9fa;">
          <h2 style="color:#0a58ca;">Clinigoal Password Reset</h2>
          <p>Hello <b>${user.name || "User"}</b>,</p>
          <p>Your OTP for password reset is:</p>
          <h1 style="color:#0a58ca; font-size:30px; letter-spacing:3px;">${otp}</h1>
          <p>This code is valid for <b>10 minutes</b>.</p>
          <p>If you didn’t request this, you can safely ignore this email.</p>
          <p style="margin-top:20px;">— Clinigoal Support Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent to ${email}`);
    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("❌ Error sending OTP:", err);
    res.status(500).json({ message: "Error sending OTP" });
  }
});

// 4️⃣ Verify OTP
app.post("/api/forgot-password/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.otp !== otp || Date.now() > user.otpExpiry)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error verifying OTP" });
  }
});

// 5️⃣ Reset Password
app.post("/api/forgot-password/reset", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error resetting password" });
  }
});

// ✅ 6️⃣ Upload Profile Photo
app.post("/api/user/upload-photo/:id", upload.single("photo"), async (req, res) => {
  try {
    const userId = req.params.id;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const photoBase64 = req.file.buffer.toString("base64");
    await User.findByIdAndUpdate(userId, { profilePhoto: photoBase64 });

    res.json({ success: true, message: "Profile photo uploaded successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error uploading photo", error: err.message });
  }
});

// ✅ 7️⃣ Get User Profile
app.get("/api/user/:id/profile", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("name email profilePhoto");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Error fetching profile" });
  }
});

// ✅ 8️⃣ Remove Profile Photo
app.delete("/api/user/:id/remove-photo", async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { profilePhoto: "" });
    res.json({ success: true, message: "Profile photo removed" });
  } catch (err) {
    res.status(500).json({ message: "Error removing photo" });
  }
});

// ----------------- ADMIN OTP ROUTES (Enhanced) -----------------
app.post("/api/admin/forgot-password/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    admin.otp = otp;
    admin.otpExpiry = Date.now() + 10 * 60 * 1000;
    await admin.save();

    const mailOptions = {
      from: `"Clinigoal Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔐 Clinigoal Admin OTP Verification",
      html: `
        <div style="font-family:Arial, sans-serif; padding:20px; border-radius:8px; background:#f8f9fa;">
          <h2 style="color:#dc3545;">Clinigoal Admin Verification</h2>
          <p>Dear Admin,</p>
          <p>Your OTP for password reset is:</p>
          <h1 style="color:#dc3545; font-size:30px; letter-spacing:3px;">${otp}</h1>
          <p>This OTP will expire in <b>10 minutes</b>.</p>
          <p>If this was not you, please secure your account immediately.</p>
          <p style="margin-top:20px;">— Clinigoal Security Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Admin OTP sent to ${email}`);
    res.json({ message: "OTP sent successfully!" });
  } catch (err) {
    console.error("❌ Error sending admin OTP:", err);
    res.status(500).json({ message: "Error sending OTP" });
  }
});

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

app.post("/api/admin/forgot-password/reset", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    admin.password = await bcrypt.hash(newPassword, 10);
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
    res
      .status(err.message === "Payment not approved yet" ? 403 : 500)
      .json({ error: err.message });
  }
});

// ----------------- START SERVER -----------------
// ----------------- START SERVER -----------------

// ✅ Health check route for Render
// ----------------- HEALTH CHECK -----------------
app.get("/", (req, res) => {
  res.send("✅ Clinigoal server is running successfully on Render!");
});

// ----------------- START SERVER -----------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
