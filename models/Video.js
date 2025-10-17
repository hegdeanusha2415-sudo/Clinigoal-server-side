// models/Video.js
const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  course: {
    type: String,
    required: true,
  },
  url: {
    type: String, // path to uploaded file
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Video", videoSchema);
