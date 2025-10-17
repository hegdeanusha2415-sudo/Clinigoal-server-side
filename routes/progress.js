const express = require("express");
const router = express.Router();
const UserProgress = require("../models/UserProgress");

// Get user progress
router.get("/", async (req, res) => {
  const { userId, courseId } = req.query;
  const progress = await UserProgress.findOne({ userId, courseId });
  res.json(progress || {});
});

// Video watched
router.post("/video", async (req, res) => {
  const { userId, courseId, videoId } = req.body;
  let progress = await UserProgress.findOne({ userId, courseId });
  if (!progress) {
    progress = new UserProgress({ userId, courseId, videosWatched: [] });
  }
  if (!progress.videosWatched.includes(videoId)) progress.videosWatched.push(videoId);
  await progress.save();
  res.json(progress);
});

// Notes viewed
router.post("/notes", async (req, res) => {
  const { userId, courseId } = req.body;
  let progress = await UserProgress.findOne({ userId, courseId });
  if (!progress) progress = new UserProgress({ userId, courseId });
  progress.notesViewed = true;
  await progress.save();
  res.json(progress);
});

// Assignment submitted
router.post("/assignment", async (req, res) => {
  const { userId, courseId } = req.body;
  let progress = await UserProgress.findOne({ userId, courseId });
  if (!progress) progress = new UserProgress({ userId, courseId });
  progress.assignmentSubmitted = true;
  await progress.save();
  res.json(progress);
});

// Quiz attempt
router.post("/quiz", async (req, res) => {
  const { userId, courseId, score } = req.body; // score: out of 100
  let progress = await UserProgress.findOne({ userId, courseId });
  if (!progress) progress = new UserProgress({ userId, courseId });
  const attempts = progress.quizAttempts.length;
  if (attempts >= 2) return res.json({ passed: false, remainingAttempts: 0 });
  
  progress.quizAttempts.push({ attemptNumber: attempts + 1, score });
  await progress.save();
  
  const passed = score >= 70;
  res.json({ passed, remainingAttempts: 2 - (attempts + 1) });
});

// Generate certificate
router.post("/certificate", async (req, res) => {
  const { userId, courseId } = req.body;
  let progress = await UserProgress.findOne({ userId, courseId });
  if (!progress) progress = new UserProgress({ userId, courseId });
  progress.certificateGenerated = true;
  await progress.save();
  // For simplicity, just send a dummy certificate URL
  res.json({ certificateUrl: `https://dummycertificate.com/${userId}-${courseId}.pdf` });
});

module.exports = router;
