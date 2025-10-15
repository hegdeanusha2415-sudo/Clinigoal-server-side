const express = require('express');
const Video = require('../models/Video');
const Note = require('../models/Note');
const Quiz = require('../models/Quiz');

const router = express.Router();

// GET all videos, notes, quizzes for user dashboard
router.get('/videos', async (req, res) => {
  const videos = await Video.find().sort({ createdAt: -1 });
  res.json(videos);
});

router.get('/notes', async (req, res) => {
  const notes = await Note.find().sort({ createdAt: -1 });
  res.json(notes);
});

router.get('/quizzes', async (req, res) => {
  const quizzes = await Quiz.find().sort({ createdAt: -1 });
  res.json(quizzes);
});

module.exports = router;
