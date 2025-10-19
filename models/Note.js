const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  title: String,
  courseId: String,
  filePath: String,
});

module.exports = mongoose.model("Note", noteSchema);
