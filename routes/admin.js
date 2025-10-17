const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');

const router = express.Router();

// Configure multer for video storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const courseId = req.body.course || 'general';
    const uploadPath = path.join(__dirname, '../uploads/videos', courseId);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = uniqueSuffix + extension;
    cb(null, filename);
  }
});

// File filter for videos only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Upload video endpoint
router.post('/videos', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { title, course, description } = req.body;

    // Create video record in database
    const video = new Video({
      title,
      description: description || 'No description provided',
      course,
      courseName: req.body.courseName || 'General',
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      url: `/uploads/videos/${course}/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    await video.save();

    res.status(201).json({
      message: 'Video uploaded successfully',
      video: {
        _id: video._id,
        title: video.title,
        course: video.course,
        url: video.url,
        fileSize: video.fileSize,
        uploadDate: video.uploadDate
      }
    });

  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

// Get all videos endpoint
router.get('/videos', async (req, res) => {
  try {
    const videos = await Video.find()
      .sort({ uploadDate: -1 })
      .select('title description course courseName url fileSize uploadDate duration isPublished');
    
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Get videos by course
router.get('/videos/course/:courseId', async (req, res) => {
  try {
    const videos = await Video.find({ course: req.params.courseId })
      .sort({ order: 1, uploadDate: -1 });
    
    res.json(videos);
  } catch (error) {
    console.error('Error fetching course videos:', error);
    res.status(500).json({ error: 'Failed to fetch course videos' });
  }
});

// Delete video endpoint
router.delete('/videos/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Delete physical file
    if (fs.existsSync(video.filePath)) {
      fs.unlinkSync(video.filePath);
    }

    // Delete from database
    await Video.findByIdAndDelete(req.params.id);

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

// Serve video files statically
router.use('/uploads/videos', express.static(path.join(__dirname, '../uploads/videos')));

module.exports = router;