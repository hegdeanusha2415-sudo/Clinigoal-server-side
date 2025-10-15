const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
}));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

// Ensure videos subdirectory exists
const videosDir = path.join(uploadsDir, 'videos');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
  console.log('📁 Created videos directory:', videosDir);
}

// Ensure notes subdirectory exists
const notesDir = path.join(uploadsDir, 'notes');
if (!fs.existsSync(notesDir)) {
  fs.mkdirSync(notesDir, { recursive: true });
  console.log('📁 Created notes directory:', notesDir);
}

// Enhanced Middleware
app.use(cors({
  origin: ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// MongoDB connection with better error handling
mongoose.connect('mongodb://127.0.0.1:27017/clinigoal', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("✅ MongoDB Connected Successfully");
})
.catch(err => {
  console.error("❌ MongoDB Connection Error:", err);
  process.exit(1);
});

// ==================== DEFINE ENHANCED SCHEMAS AND MODELS ====================

// Video Schema
const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  course: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: 'No description provided'
  },
  url: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    default: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  duration: {
    type: Number,
    default: 0
  },
  module: {
    type: String,
    default: 'Module 1'
  },
  order: {
    type: Number,
    default: 0
  },
  fileSize: {
    type: Number,
    default: 0
  },
  fileName: {
    type: String,
    default: ''
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Note Schema
const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  course: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: 'No description provided'
  },
  url: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  pages: {
    type: Number,
    default: 0
  },
  fileSize: {
    type: Number,
    default: 0
  },
  fileName: {
    type: String,
    default: ''
  },
  downloadUrl: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Quiz Schema
const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  course: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  timeLimit: {
    type: Number,
    default: 30
  },
  passingScore: {
    type: Number,
    default: 70
  },
  questions: [{
    questionText: {
      type: String,
      required: true
    },
    options: [{
      optionText: {
        type: String,
        required: true
      },
      isCorrect: {
        type: Boolean,
        default: false
      }
    }]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Enhanced User Schema with password hashing
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Password verification method
userSchema.methods.isValidPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Enhanced Payment Schema with approval workflow
const paymentSchema = new mongoose.Schema({
  courseId: {
    type: String,
    required: true
  },
  courseTitle: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  studentEmail: {
    type: String,
    required: true
  },
  studentId: {
    type: String,
    required: true
  },
  amount: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    required: true
  },
  receiptNumber: {
    type: String,
    required: true
  },
  metadata: {
    type: Map,
    of: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  approvedAt: Date,
  approvedBy: String,
  rejectionReason: String
});

// Review Schema
const reviewSchema = new mongoose.Schema({
  courseId: {
    type: String,
    required: true
  },
  courseTitle: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  reviewText: {
    type: String,
    required: true
  },
  anonymous: {
    type: Boolean,
    default: false
  },
  adminReply: {
    type: String
  },
  replyDate: {
    type: Date
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  helpfulVotes: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Course Schema
const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  instructor: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  level: {
    type: String,
    default: 'Beginner'
  },
  price: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  features: [{
    type: String
  }],
  students: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 4.5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// User Activity Schema for tracking user actions
const userActivitySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  courseId: {
    type: String
  },
  courseTitle: {
    type: String
  },
  details: {
    type: Object
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create models
const Video = mongoose.model('Video', videoSchema);
const Note = mongoose.model('Note', noteSchema);
const Quiz = mongoose.model('Quiz', quizSchema);
const User = mongoose.model('User', userSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Review = mongoose.model('Review', reviewSchema);
const Course = mongoose.model('Course', courseSchema);
const UserActivity = mongoose.model('UserActivity', userActivitySchema);

// ==================== ENHANCED SOCKET.IO REAL-TIME COMMUNICATION ====================

const connectedUsers = new Map();
const connectedAdmins = new Set();

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.on('userAuthenticated', (userData) => {
    connectedUsers.set(socket.id, {
      ...userData,
      socketId: socket.id,
      connectedAt: new Date(),
      lastActivity: new Date(),
      isOnline: true
    });
    
    socket.join(`user_${userData.userId}`);
    console.log(`👤 User ${userData.userName} joined user room:`, socket.id);
    
    // Notify admins of user activity
    socket.to('admins').emit('userOnline', userData);
  });

  socket.on('joinAdminRoom', (adminData) => {
    socket.join('admins');
    connectedAdmins.add(socket.id);
    console.log('👨‍💼 Admin joined admin room:', socket.id);
    
    // Send current connected users to admin
    const users = Array.from(connectedUsers.values());
    socket.emit('currentUsers', users);
  });

  socket.on('userActivity', (activityData) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.lastActivity = new Date();
      user.lastActivityType = activityData.type;
      
      // Log activity to database
      const activity = new UserActivity({
        userId: user.userId,
        userName: user.userName,
        userEmail: user.userEmail,
        action: activityData.type,
        courseId: activityData.courseId,
        courseTitle: activityData.courseTitle,
        details: activityData.details,
        timestamp: new Date()
      });
      
      activity.save().catch(err => console.error('Activity logging error:', err));
      
      // Notify admins of user activity
      socket.to('admins').emit('userActivity', {
        user: user,
        activity: activityData,
        timestamp: new Date()
      });
    }
  });

  socket.on('newPayment', (paymentData) => {
    console.log('💰 Real-time payment received from client:', paymentData);
    io.to('admins').emit('newPayment', paymentData);
  });

  socket.on('newContent', (contentData) => {
    console.log('🔄 New content added:', contentData);
    io.to('admins').emit('newContent', contentData);
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.to('admins').emit('userOffline', user);
      connectedUsers.delete(socket.id);
    }
    
    if (connectedAdmins.has(socket.id)) {
      connectedAdmins.delete(socket.id);
    }
    
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Helper function to emit real-time events
const emitRealTimeUpdate = (event, data) => {
  io.to('admins').emit(event, data);
};

// ==================== VALIDATION MIDDLEWARE ====================

// Validate ObjectId
const validateObjectId = (req, res, next) => {
  if (req.params.id && !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }
  next();
};

// Validate payment data
const validatePayment = (req, res, next) => {
  const { courseId, courseTitle, studentName, studentEmail, amount } = req.body;
  
  if (!courseId || !courseTitle || !studentName || !studentEmail || !amount) {
    return res.status(400).json({ error: "Missing required payment fields" });
  }
  
  if (!studentEmail.includes('@')) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  
  next();
};

// ==================== HEALTH CHECK ENDPOINTS ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health/detailed', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
      status: 'OK',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      connectedUsers: connectedUsers.size,
      connectedAdmins: connectedAdmins.size
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

// ==================== COURSE ROUTES ====================

// Get all courses
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    console.error("❌ Error fetching courses:", error);
    res.status(500).json({ error: "Failed to fetch courses: " + error.message });
  }
});

// Create course
app.post('/api/courses', async (req, res) => {
  try {
    const course = new Course(req.body);
    await course.save();
    res.status(201).json(course);
  } catch (error) {
    console.error("❌ Error creating course:", error);
    res.status(500).json({ error: "Failed to create course: " + error.message });
  }
});

// Update course
app.put('/api/courses/:id', validateObjectId, async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    
    res.json(course);
  } catch (error) {
    console.error("❌ Error updating course:", error);
    res.status(500).json({ error: "Failed to update course: " + error.message });
  }
});

// Delete course
app.delete('/api/courses/:id', validateObjectId, async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting course:", error);
    res.status(500).json({ error: "Failed to delete course: " + error.message });
  }
});

// ==================== ADMIN VIDEO ROUTES ====================

// Enhanced multer configuration with better security
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    let dir;
    if (file.mimetype.startsWith('video/')) {
      dir = videosDir;
    } else {
      dir = notesDir;
    }
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
    files: 1
  },
  fileFilter: function(req, file, cb) {
    // Enhanced file type validation
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    const allowedDocTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (file.mimetype.startsWith('video/')) {
      if (!allowedVideoTypes.includes(file.mimetype)) {
        return cb(new Error('Invalid video format. Allowed: MP4, WebM, Ogg'), false);
      }
    } else if (file.mimetype.startsWith('application/') || file.mimetype.startsWith('text/')) {
      if (!allowedDocTypes.includes(file.mimetype)) {
        return cb(new Error('Invalid document format. Allowed: PDF, DOC, DOCX, TXT'), false);
      }
    } else if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Invalid file type: ' + file.mimetype), false);
    }

    cb(null, true);
  }
});

// Helper function to safely delete files
const safeDeleteFile = (filePath) => {
  try {
    if (filePath && !filePath.startsWith('http')) {
      const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
      const fullPath = path.join(__dirname, cleanPath);
      
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('🗑 File deleted: ' + fullPath);
      }
    }
  } catch (err) {
    console.error('❌ Error deleting file ' + filePath + ':', err);
  }
};

// Get all videos
app.get('/api/admin/videos', async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    console.error("❌ Error fetching videos:", error);
    res.status(500).json({ error: "Failed to fetch videos: " + error.message });
  }
});

// Upload video
app.post('/api/admin/videos', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    const { title, course, description, duration, module, order } = req.body;
    
    if (!title || !course) {
      safeDeleteFile(req.file.path);
      return res.status(400).json({ error: "Title and course are required" });
    }

    const videoData = {
      title: title.trim(),
      course: course.trim(),
      description: description ? description.trim() : 'No description provided',
      url: '/uploads/videos/' + req.file.filename,
      duration: duration ? parseInt(duration) : 0,
      module: module ? module.trim() : 'Module 1',
      order: order ? parseInt(order) : 0,
      fileSize: Math.round(req.file.size / (1024 * 1024)),
      fileName: req.file.originalname
    };

    const video = new Video(videoData);
    await video.save();

    // Emit real-time update
    emitRealTimeUpdate('newContent', { type: 'video', data: video });

    res.status(201).json(video);
  } catch (error) {
    console.error('❌ Error uploading video:', error);
    if (req.file) {
      safeDeleteFile(req.file.path);
    }
    res.status(500).json({ error: "Failed to upload video: " + error.message });
  }
});

// Update video
app.put('/api/admin/videos/:id', validateObjectId, upload.single('file'), async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    const { title, course, description, duration, module, order } = req.body;
    
    // Update fields
    video.title = title || video.title;
    video.course = course || video.course;
    video.description = description || video.description;
    video.duration = duration ? parseInt(duration) : video.duration;
    video.module = module || video.module;
    video.order = order ? parseInt(order) : video.order;
    video.updatedAt = new Date();

    // If new file uploaded
    if (req.file) {
      // Delete old file
      safeDeleteFile(video.url);
      
      // Update with new file
      video.url = '/uploads/videos/' + req.file.filename;
      video.fileSize = Math.round(req.file.size / (1024 * 1024));
      video.fileName = req.file.originalname;
    }

    await video.save();
    res.json(video);
  } catch (error) {
    console.error('❌ Error updating video:', error);
    res.status(500).json({ error: "Failed to update video: " + error.message });
  }
});

// Delete video
app.delete('/api/admin/videos/:id', validateObjectId, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }
    
    // Delete associated file
    safeDeleteFile(video.url);
    
    await Video.findByIdAndDelete(req.params.id);
    res.json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error('❌ Error deleting video:', error);
    res.status(500).json({ error: "Failed to delete video: " + error.message });
  }
});

// ==================== ADMIN NOTE ROUTES ====================

// Get all notes
app.get('/api/admin/notes', async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    console.error("❌ Error fetching notes:", error);
    res.status(500).json({ error: "Failed to fetch notes: " + error.message });
  }
});

// Upload note
app.post('/api/admin/notes', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No document file uploaded" });
    }

    const { title, course, description, pages, fileType } = req.body;
    
    if (!title || !course) {
      safeDeleteFile(req.file.path);
      return res.status(400).json({ error: "Title and course are required" });
    }

    const noteData = {
      title: title.trim(),
      course: course.trim(),
      description: description ? description.trim() : 'No description provided',
      url: '/uploads/notes/' + req.file.filename,
      downloadUrl: '/uploads/notes/' + req.file.filename,
      fileType: fileType || req.file.mimetype,
      pages: pages ? parseInt(pages) : 0,
      fileSize: Math.round(req.file.size / 1024),
      fileName: req.file.originalname
    };

    const note = new Note(noteData);
    await note.save();

    // Emit real-time update
    emitRealTimeUpdate('newContent', { type: 'note', data: note });

    res.status(201).json(note);
  } catch (error) {
    console.error("❌ Error uploading note:", error);
    if (req.file) {
      safeDeleteFile(req.file.path);
    }
    res.status(500).json({ error: "Failed to upload note: " + error.message });
  }
});

// Update note
app.put('/api/admin/notes/:id', validateObjectId, upload.single('file'), async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    const { title, course, description, pages, fileType } = req.body;
    
    // Update fields
    note.title = title || note.title;
    note.course = course || note.course;
    note.description = description || note.description;
    note.pages = pages ? parseInt(pages) : note.pages;
    note.fileType = fileType || note.fileType;
    note.updatedAt = new Date();

    // If new file uploaded
    if (req.file) {
      // Delete old file
      safeDeleteFile(note.url);
      
      // Update with new file
      note.url = '/uploads/notes/' + req.file.filename;
      note.downloadUrl = '/uploads/notes/' + req.file.filename;
      note.fileSize = Math.round(req.file.size / 1024);
      note.fileName = req.file.originalname;
    }

    await note.save();
    res.json(note);
  } catch (error) {
    console.error("❌ Error updating note:", error);
    res.status(500).json({ error: "Failed to update note: " + error.message });
  }
});

// Delete note
app.delete('/api/admin/notes/:id', validateObjectId, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }
    
    // Delete associated file
    safeDeleteFile(note.url);
    
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting note:", error);
    res.status(500).json({ error: "Failed to delete note: " + error.message });
  }
});

// ==================== ADMIN QUIZ ROUTES ====================

// Get all quizzes
app.get('/api/admin/quizzes', async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (error) {
    console.error("❌ Error fetching quizzes:", error);
    res.status(500).json({ error: "Failed to fetch quizzes: " + error.message });
  }
});

// Get single quiz
app.get('/api/admin/quizzes/:id', validateObjectId, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }
    
    res.json(quiz);
  } catch (error) {
    console.error("❌ Error fetching quiz:", error);
    res.status(500).json({ error: "Failed to fetch quiz: " + error.message });
  }
});

// Create quiz
app.post('/api/admin/quizzes', async (req, res) => {
  try {
    const { title, course, description, timeLimit, passingScore, questions } = req.body;

    if (!title || !course) {
      return res.status(400).json({ error: "Title and course are required" });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "At least one question is required" });
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText || !q.questionText.trim()) {
        return res.status(400).json({ error: `Question ${i + 1} text is required` });
      }

      if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({ error: `Question ${i + 1} must have at least 2 options` });
      }

      const hasCorrectOption = q.options.some(opt => opt.isCorrect);
      if (!hasCorrectOption) {
        return res.status(400).json({ error: `Question ${i + 1} must have at least one correct option` });
      }
    }

    const quizData = {
      title: title.trim(),
      course: course.trim(),
      description: description || '',
      timeLimit: timeLimit ? parseInt(timeLimit) : 30,
      passingScore: passingScore ? parseInt(passingScore) : 70,
      questions: questions
    };

    const quiz = new Quiz(quizData);
    await quiz.save();

    // Emit real-time update
    emitRealTimeUpdate('newContent', { type: 'quiz', data: quiz });

    res.status(201).json(quiz);
  } catch (error) {
    console.error('❌ Error creating quiz:', error);
    res.status(500).json({ error: "Failed to create quiz: " + error.message });
  }
});

// Update quiz
app.put('/api/admin/quizzes/:id', validateObjectId, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const { title, course, description, timeLimit, passingScore, questions } = req.body;

    if (!title || !course) {
      return res.status(400).json({ error: "Title and course are required" });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "At least one question is required" });
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText || !q.questionText.trim()) {
        return res.status(400).json({ error: `Question ${i + 1} text is required` });
      }

      const hasCorrectOption = q.options.some(opt => opt.isCorrect);
      if (!hasCorrectOption) {
        return res.status(400).json({ error: `Question ${i + 1} must have at least one correct option` });
      }
    }

    // Update quiz
    quiz.title = title.trim();
    quiz.course = course.trim();
    quiz.description = description || '';
    quiz.timeLimit = timeLimit ? parseInt(timeLimit) : 30;
    quiz.passingScore = passingScore ? parseInt(passingScore) : 70;
    quiz.questions = questions;
    quiz.updatedAt = new Date();

    await quiz.save();
    res.json(quiz);
  } catch (error) {
    console.error('❌ Error updating quiz:', error);
    res.status(500).json({ error: "Failed to update quiz: " + error.message });
  }
});

// Delete quiz
app.delete('/api/admin/quizzes/:id', validateObjectId, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }
    
    await Quiz.findByIdAndDelete(req.params.id);
    res.json({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.error('❌ Error deleting quiz:', error);
    res.status(500).json({ error: "Failed to delete quiz: " + error.message });
  }
});

// ==================== USER ROUTES ====================

// Get videos by course
app.get('/api/videos/course/:courseId', async (req, res) => {
  try {
    const videos = await Video.find({ course: req.params.courseId }).sort({ order: 1 });
    res.json(videos);
  } catch (error) {
    console.error("❌ Error fetching videos by course:", error);
    res.status(500).json({ error: "Failed to fetch videos: " + error.message });
  }
});

// Get notes by course
app.get('/api/notes/course/:courseId', async (req, res) => {
  try {
    const notes = await Note.find({ course: req.params.courseId }).sort({ createdAt: 1 });
    res.json(notes);
  } catch (error) {
    console.error("❌ Error fetching notes by course:", error);
    res.status(500).json({ error: "Failed to fetch notes: " + error.message });
  }
});

// Get quizzes by course
app.get('/api/quizzes/course/:courseId', async (req, res) => {
  try {
    const quizzes = await Quiz.find({ course: req.params.courseId }).sort({ createdAt: 1 });
    res.json(quizzes);
  } catch (error) {
    console.error("❌ Error fetching quizzes by course:", error);
    res.status(500).json({ error: "Failed to fetch quizzes: " + error.message });
  }
});

// ==================== ENHANCED PAYMENT ROUTES ====================

// Get all payments
app.get('/api/admin/payments', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ timestamp: -1 });
    res.json(payments);
  } catch (error) {
    console.error("❌ Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments: " + error.message });
  }
});

// Get pending payments for approval
app.get('/api/admin/pending-payments', async (req, res) => {
  try {
    const pendingPayments = await Payment.find({ 
      approvalStatus: 'pending',
      status: 'completed'
    }).sort({ timestamp: -1 });
    res.json(pendingPayments);
  } catch (error) {
    console.error("❌ Error fetching pending payments:", error);
    res.status(500).json({ error: "Failed to fetch pending payments: " + error.message });
  }
});

// Create payment
app.post('/api/payments', validatePayment, async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      receiptNumber: `RCPT-${Date.now().toString().slice(-8)}`,
      metadata: new Map(Object.entries(req.body.metadata || {}))
    };

    const payment = new Payment(paymentData);
    await payment.save();
    
    // Emit real-time update
    emitRealTimeUpdate('newPayment', payment);
    
    res.status(201).json(payment);
  } catch (error) {
    console.error("❌ Error creating payment:", error);
    res.status(500).json({ error: "Failed to create payment: " + error.message });
  }
});

// Approve payment
app.put('/api/admin/payments/:id/approve', validateObjectId, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      {
        approvalStatus: 'approved',
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: req.body.adminId || 'system'
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Emit real-time updates
    io.to('admins').emit('paymentApproved', payment);
    io.to(`user_${payment.studentId}`).emit('enrollmentApproved', payment);

    res.json(payment);
  } catch (error) {
    console.error("❌ Error approving payment:", error);
    res.status(500).json({ error: "Failed to approve payment: " + error.message });
  }
});

// Reject payment
app.put('/api/admin/payments/:id/reject', validateObjectId, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      {
        approvalStatus: 'rejected',
        status: 'rejected',
        rejectionReason: req.body.rejectionReason
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    io.to('admins').emit('paymentRejected', payment);
    io.to(`user_${payment.studentId}`).emit('enrollmentRejected', payment);

    res.json(payment);
  } catch (error) {
    console.error("❌ Error rejecting payment:", error);
    res.status(500).json({ error: "Failed to reject payment: " + error.message });
  }
});

// Get user's approved courses
app.get('/api/user/:userId/approved-courses', async (req, res) => {
  try {
    const approvedPayments = await Payment.find({
      studentId: req.params.userId,
      approvalStatus: 'approved',
      status: 'approved'
    });
    
    const approvedCourseIds = approvedPayments.map(payment => payment.courseId);
    res.json(approvedCourseIds);
  } catch (error) {
    console.error("❌ Error fetching approved courses:", error);
    res.status(500).json({ error: "Failed to fetch approved courses: " + error.message });
  }
});

// ==================== ENHANCED REVIEW ROUTES ====================

// Get all reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    console.error("❌ Error fetching reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews: " + error.message });
  }
});

// Create review
app.post('/api/reviews', async (req, res) => {
  try {
    const review = new Review(req.body);
    await review.save();
    
    // Update course rating stats
    await updateCourseRating(review.courseId);
    
    res.status(201).json(review);
  } catch (error) {
    console.error("❌ Error creating review:", error);
    res.status(500).json({ error: "Failed to create review: " + error.message });
  }
});

// Update course rating helper function
const updateCourseRating = async (courseId) => {
  try {
    const reviews = await Review.find({ courseId });
    if (reviews.length > 0) {
      const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
      await Course.findByIdAndUpdate(courseId, {
        rating: Math.round(averageRating * 10) / 10,
        totalReviews: reviews.length
      });
    }
  } catch (error) {
    console.error("Error updating course rating:", error);
  }
};

// Add admin reply to review
app.put('/api/reviews/:id/reply', validateObjectId, async (req, res) => {
  try {
    const { adminReply } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      {
        adminReply,
        replyDate: new Date()
      },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    res.json(review);
  } catch (error) {
    console.error("❌ Error adding reply to review:", error);
    res.status(500).json({ error: "Failed to add reply: " + error.message });
  }
});

// ==================== USER ACTIVITY ROUTES ====================

// Log user activity
app.post('/api/user-activity', async (req, res) => {
  try {
    const activity = new UserActivity(req.body);
    await activity.save();
    
    // Emit real-time activity to admins
    io.to('admins').emit('userActivity', activity);
    
    res.status(201).json(activity);
  } catch (error) {
    console.error("❌ Error logging user activity:", error);
    res.status(500).json({ error: "Failed to log activity: " + error.message });
  }
});

// Get user activities
app.get('/api/admin/user-activities', async (req, res) => {
  try {
    const activities = await UserActivity.find().sort({ timestamp: -1 }).limit(50);
    res.json(activities);
  } catch (error) {
    console.error("❌ Error fetching user activities:", error);
    res.status(500).json({ error: "Failed to fetch user activities: " + error.message });
  }
});

// ==================== ENHANCED AUTH ROUTES ====================

// User registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }
    
    const user = new User({ 
      email, 
      password, 
      name: name || '',
      phone: phone || ''
    });
    await user.save();
    
    res.status(201).json({ 
      message: "User registered successfully",
      userId: user._id 
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ error: "Registration failed: " + error.message });
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const isValidPassword = await user.isValidPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Update user login stats
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ error: "Login failed: " + error.message });
  }
});

// ==================== ERROR HANDLING ====================

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🔥 Global Error Handler:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 500MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files.' });
    }
  }
  
  // Don't leak error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: isProduction ? 'Internal server error' : error.message,
    ...(isProduction ? {} : { stack: error.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found: ' + req.method + ' ' + req.url 
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('🚀 Server running on port ' + PORT);
  console.log('📁 Uploads directory: ' + uploadsDir);
  console.log('✅ MongoDB connected: clinigoal database');
  console.log('🔌 WebSocket server ready for real-time updates!');
  console.log('🏥 Health checks available at /health and /health/detailed');
});