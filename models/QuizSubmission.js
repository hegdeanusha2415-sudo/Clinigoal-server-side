const mongoose = require("mongoose");

const quizSubmissionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  quizTitle: String,
  score: Number,
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("QuizSubmission", quizSubmissionSchema);
