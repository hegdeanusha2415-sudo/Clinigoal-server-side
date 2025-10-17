const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  courseName: { type: String, required: true },
  videos: [{ type: String }],   // File URLs
  notes: [{ type: String }],    // File URLs
  quizzes: [{ type: String }],  // Quiz titles or IDs
});

module.exports = mongoose.model("Course", courseSchema);
