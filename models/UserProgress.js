const mongoose = require("mongoose");

const UserProgressSchema = new mongoose.Schema({
  userId: String,
  courseId: String,
  videosWatched: [String], // array of video IDs
  notesViewed: { type: Boolean, default: false },
  assignmentSubmitted: { type: Boolean, default: false },
  quizAttempts: [{ attemptNumber: Number, score: Number }],
  certificateGenerated: { type: Boolean, default: false },
});

module.exports = mongoose.model("UserProgress", UserProgressSchema);
