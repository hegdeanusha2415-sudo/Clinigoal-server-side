import express from "express";
import Quiz from "../models/Quiz.js";

const router = express.Router();

/* -------------------- TEST ROUTE -------------------- */
router.get("/test", (req, res) => {
  res.send("🧠 Quiz route working perfectly!");
});

/* -------------------- CREATE QUIZ -------------------- */
router.post("/", async (req, res) => {
  try {
    const { question, options, correctAnswer, courseId } = req.body;
    if (!question || !options || !correctAnswer || !courseId)
      return res.status(400).json({ message: "All fields are required" });

    const quiz = await Quiz.create({ question, options, correctAnswer, courseId });
    res.json({ message: "✅ Quiz created successfully", quiz });
  } catch (err) {
    console.error("❌ Error creating quiz:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -------------------- GET ALL QUIZZES -------------------- */
router.get("/", async (req, res) => {
  try {
    const quizzes = await Quiz.find();
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* -------------------- UPDATE QUIZ -------------------- */
router.put("/:id", async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json({ message: "✅ Quiz updated successfully", quiz });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* -------------------- DELETE QUIZ -------------------- */
router.delete("/:id", async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json({ message: "🗑️ Quiz deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
