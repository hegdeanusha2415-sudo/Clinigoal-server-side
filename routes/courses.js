const express = require("express");
const router = express.Router();
const Course = require("../models/Course");
const upload = require("../middlewares/upload");

// Add new course with videos and notes
router.post(
  "/",
  upload.fields([
    { name: "videos", maxCount: 10 },
    { name: "notes", maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const { courseName, quizzes } = req.body;

      const videoFiles = req.files["videos"] ? req.files["videos"].map(f => f.filename) : [];
      const noteFiles = req.files["notes"] ? req.files["notes"].map(f => f.filename) : [];
      const quizArray = quizzes ? JSON.parse(quizzes) : [];

      const course = new Course({
        courseName,
        videos: videoFiles,
        notes: noteFiles,
        quizzes: quizArray,
      });

      await course.save();
      res.status(201).json(course);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

// Get all courses
router.get("/", async (req, res) => {
  const courses = await Course.find();
  res.json(courses);
});

module.exports = router;
