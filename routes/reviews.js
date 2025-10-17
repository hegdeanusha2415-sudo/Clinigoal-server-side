const express = require("express");
const router = express.Router();
const Review = require("../models/Review");

// Get all reviews
router.get("/", async (req, res) => {
  const reviews = await Review.find().populate("user course");
  res.json(reviews);
});

// Add review
router.post("/", async (req, res) => {
  const review = new Review(req.body);
  await review.save();
  res.status(201).json(review);
});

module.exports = router;
