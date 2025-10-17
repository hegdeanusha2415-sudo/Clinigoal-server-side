const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  courseName: { type: String, required: true },
  videos: [{ type: String }],
  notes: [{ type: String }],
  quizzes: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);
