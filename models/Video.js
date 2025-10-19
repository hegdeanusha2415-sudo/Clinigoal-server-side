const mongoose = require("mongoose");

const VideoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  courseId: { type: String, required: true },
  filePath: { type: String, required: true },
});

module.exports = mongoose.model("Video", VideoSchema);
