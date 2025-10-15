import express from "express";
import multer from "multer";
import Video from "../models/Video.js";

const router = express.Router();

// Multer setup for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/videos"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// CREATE Video
router.post("/", upload.single("video"), async (req, res) => {
  try {
    const video = new Video({
      title: req.body.title,
      course: req.body.course,
      description: req.body.description,
      url: `/uploads/videos/${req.file.filename}`,
      fileSize: req.file.size,
    });
    await video.save();
    res.status(201).json(video);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// READ Videos
router.get("/", async (req, res) => {
  const videos = await Video.find().sort({ uploadDate: -1 });
  res.json(videos);
});

// UPDATE Video (title, description, course only)
router.put("/:id", async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(video);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE Video
router.delete("/:id", async (req, res) => {
  try {
    await Video.findByIdAndDelete(req.params.id);
    res.json({ message: "Video deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
