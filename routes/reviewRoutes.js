import express from "express";
import Review from "../models/Review.js";

const router = express.Router();

// ✅ Get all reviews
router.get("/", async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// ✅ Add a new review
router.post("/", async (req, res) => {
  try {
    const { name, message, rating } = req.body;
    if (!name || !message || !rating)
      return res.status(400).json({ error: "All fields required" });

    const review = new Review({ name, message, rating });
    await review.save();
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: "Failed to add review" });
  }
});

// ✅ Delete review
router.delete("/:id", async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete review" });
  }
});

export default router;
