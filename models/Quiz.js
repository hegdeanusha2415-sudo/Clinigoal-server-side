const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  course: { type: String, required: true },
  courseName: { type: String, required: true },
  questions: [{
    questionText: { type: String, required: true },
    options: [{
      optionText: { type: String, required: true },
      isCorrect: { type: Boolean, default: false }
    }]
  }],
  createdDate: { type: Date, default: Date.now },
  updatedDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
