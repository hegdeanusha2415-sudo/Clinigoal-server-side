const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Video = require('../models/Video');
const Note = require('../models/Note');
const Quiz = require('../models/Quiz');

// 🔐 Add this Admin schema (optional: or import from ../models/Admin)
const ADMIN_CREDENTIALS = {
  email: process.env.ADMIN_EMAIL || 'admin@clinigoal.com',
  password: process.env.ADMIN_PASSWORD || 'admin123' // use env vars in production
};

// ---------------- ADMIN LOGIN ----------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    if (email !== ADMIN_CREDENTIALS.email)
      return res.status(401).json({ error: 'Invalid email' });

    // Compare password (in real apps, hash it)
    const valid = password === ADMIN_CREDENTIALS.password;
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    // JWT token (optional)
    const token = jwt.sign({ email }, process.env.JWT_SECRET || 'secretkey', {
      expiresIn: '2h',
    });

    res.status(200).json({ message: 'Login successful', token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- MULTER STORAGE ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'general';
    if (file.mimetype.startsWith('video/')) folder = 'videos';
    else folder = 'notes';

    const courseId = req.body.course || 'general';
    const uploadPath = path.join(__dirname, '..', 'uploads', folder, courseId);
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, uniqueSuffix + extension);
  },
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// Helper
const getCourseName = (id) => {
  const courses = {
    '1': 'Clinical Research',
    '2': 'Bioinformatics',
    '3': 'Medical Coding',
    '4': 'Pharmacovigilance',
  };
  return courses[id] || 'General';
};

// ---------------- VIDEO ----------------
router.post('/videos', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video uploaded' });

    const { title, course, description } = req.body;

    const video = new Video({
      title,
      description: description || '',
      course,
      courseName: getCourseName(course),
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      url: `/uploads/videos/${course}/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });
    await video.save();
    res.status(201).json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/videos', async (req, res) => {
  const videos = await Video.find().sort({ createdAt: -1 });
  res.json(videos);
});

router.put('/videos/:id', async (req, res) => {
  const { title, course, description } = req.body;
  const video = await Video.findByIdAndUpdate(
    req.params.id,
    { title, course, description, courseName: getCourseName(course) },
    { new: true }
  );
  res.json(video);
});

router.delete('/videos/:id', async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (video && fs.existsSync(video.filePath)) fs.unlinkSync(video.filePath);
  await Video.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted successfully' });
});

// ---------------- NOTES ----------------
router.post('/notes', upload.single('file'), async (req, res) => {
  try {
    const { title, course } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const note = new Note({
      title,
      course,
      courseName: getCourseName(course),
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      url: `/uploads/notes/${course}/${req.file.filename}`,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
    });
    await note.save();
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/notes', async (req, res) => {
  const notes = await Note.find().sort({ createdAt: -1 });
  res.json(notes);
});

router.put('/notes/:id', async (req, res) => {
  const { title, course } = req.body;
  const note = await Note.findByIdAndUpdate(
    req.params.id,
    { title, course, courseName: getCourseName(course) },
    { new: true }
  );
  res.json(note);
});

router.delete('/notes/:id', async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (note && fs.existsSync(note.filePath)) fs.unlinkSync(note.filePath);
  await Note.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted successfully' });
});

// ---------------- QUIZZES ----------------
router.post('/quizzes', async (req, res) => {
  const { title, course, questions } = req.body;
  const quiz = new Quiz({
    title,
    course,
    courseName: getCourseName(course),
    questions,
  });
  await quiz.save();
  res.status(201).json(quiz);
});

router.get('/quizzes', async (req, res) => {
  const quizzes = await Quiz.find().sort({ createdAt: -1 });
  res.json(quizzes);
});

router.put('/quizzes/:id', async (req, res) => {
  const { title, course, questions } = req.body;
  const quiz = await Quiz.findByIdAndUpdate(
    req.params.id,
    { title, course, courseName: getCourseName(course), questions },
    { new: true }
  );
  res.json(quiz);
});

router.delete('/quizzes/:id', async (req, res) => {
  await Quiz.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted successfully' });
});

module.exports = router;
