// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

// -------------------- SECURITY --------------------
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
}));

// -------------------- MIDDLEWARE --------------------
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// -------------------- UPLOADS SETUP --------------------
const uploadsDir = path.join(__dirname, 'uploads');
const videosDir = path.join(uploadsDir, 'videos');
const notesDir = path.join(uploadsDir, 'notes');
[uploadsDir, videosDir, notesDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
app.use('/uploads', express.static(uploadsDir));

// -------------------- MONGODB --------------------
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

// -------------------- SOCKET.IO --------------------
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ["GET", "POST"] }
});

const connectedUsers = new Map();
const connectedAdmins = new Set();

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.on('userAuthenticated', userData => {
    connectedUsers.set(socket.id, { ...userData, socketId: socket.id, isOnline: true, lastActivity: new Date() });
    socket.join(`user_${userData.userId}`);
    socket.to('admins').emit('userOnline', userData);
  });

  socket.on('joinAdminRoom', adminData => {
    socket.join('admins');
    connectedAdmins.add(socket.id);
    socket.emit('currentUsers', Array.from(connectedUsers.values()));
  });

  socket.on('userActivity', activityData => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.lastActivity = new Date();
      io.to('admins').emit('userActivity', { user, activityData });
    }
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) socket.to('admins').emit('userOffline', user);
    connectedUsers.delete(socket.id);
    connectedAdmins.delete(socket.id);
  });
});

// -------------------- HELPERS --------------------
const safeDeleteFile = (filePath) => {
  if (!filePath || filePath.startsWith('http')) return;
  const fullPath = path.join(__dirname, filePath.startsWith('/') ? filePath.slice(1) : filePath);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
};

const sendOTPEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Clinigoal Admin OTP",
    text: `Your OTP is ${otp}. It expires in 10 minutes.`
  });
};

// -------------------- MONGOOSE SCHEMAS --------------------
// Simplified and optimized for production
const adminSchema = new mongoose.Schema({
  email: String,
  password: String,
  otp: String,
  otpExpiry: Date
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  instructor: String,
  duration: String,
  level: { type: String, default: 'Beginner' },
  price: String,
  image: String,
  features: [String],
  students: { type: Number, default: 0 },
  rating: { type: Number, default: 4.5 },
  totalReviews: { type: Number, default: 0 },
  tags: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const videoSchema = new mongoose.Schema({
  title: String,
  course: String,
  description: String,
  url: String,
  duration: Number,
  module: String,
  order: Number,
  fileSize: Number,
  fileName: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const noteSchema = new mongoose.Schema({
  title: String,
  course: String,
  description: String,
  url: String,
  fileType: String,
  pages: Number,
  fileSize: Number,
  fileName: String,
  downloadUrl: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const quizSchema = new mongoose.Schema({
  title: String,
  course: String,
  description: String,
  timeLimit: { type: Number, default: 30 },
  passingScore: { type: Number, default: 70 },
  questions: Array,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  phone: String,
  otp: { code: String, expiresAt: Date },
  isVerified: { type: Boolean, default: false },
  lastLogin: Date,
  loginCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.isValidPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

const paymentSchema = new mongoose.Schema({
  courseId: String,
  courseTitle: String,
  studentName: String,
  studentEmail: String,
  studentId: String,
  amount: String,
  paymentMethod: String,
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  transactionId: String,
  receiptNumber: String,
  metadata: { type: Map, of: String },
  timestamp: { type: Date, default: Date.now },
  approvedAt: Date,
  approvedBy: String,
  rejectionReason: String
});

// -------------------- MODELS --------------------
const Admin = mongoose.model('Admin', adminSchema);
const Course = mongoose.model('Course', courseSchema);
const Video = mongoose.model('Video', videoSchema);
const Note = mongoose.model('Note', noteSchema);
const Quiz = mongoose.model('Quiz', quizSchema);
const User = mongoose.model('User', userSchema);
const Payment = mongoose.model('Payment', paymentSchema);

// -------------------- DEPLOYMENT-READY --------------------
// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html')));
}

// -------------------- START SERVER --------------------
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
