const express = require("express");
const router = express.Router();
const QuizSubmission = require("../models/QuizSubmission");

// Submit quiz
router.post("/", async (req, res) => {
  const submission = new QuizSubmission(req.body);
  await submission.save();
  res.status(201).json(submission);
});

// Get all submissions
router.get("/", async (req, res) => {
  const submissions = await QuizSubmission.find().populate("user course");
  res.json(submissions);
});

module.exports = router;
