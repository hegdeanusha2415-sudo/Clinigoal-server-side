const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  course: { type: String, required: true },
  courseName: { type: String, required: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  filePath: { type: String, required: true },
  url: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, default: 'pdf' },
  pages: { type: Number, default: 0 },
  uploadDate: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
