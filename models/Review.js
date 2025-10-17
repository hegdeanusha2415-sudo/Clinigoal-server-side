const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  text: String,
  rating: Number,
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Review", reviewSchema);
