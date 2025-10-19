import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import Video from "../models/Video.js";

const router = express.Router();

// Ensure uploads folder exists
const uploadPath = path.join(process.cwd(), "uploads/videos");
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Test
router.get("/test", (req, res) => res.send("🎬 Video route working perfectly!"));

// Create
router.post("/", upload.single("video"), async (req, res) => {
  try {
    const { title, courseId } = req.body;
    if (!req.file) return res.status(400).json({ message: "No video file uploaded" });

    const video = await Video.create({
      title,
      courseId,
      filePath: `uploads/videos/${req.file.filename}`,
    });
    res.json({ message: "✅ Video uploaded", video });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Read all
router.get("/", async (_req, res) => res.json(await Video.find()));

// Delete
router.delete("/:id", async (req, res) => {
  const v = await Video.findById(req.params.id);
  if (!v) return res.status(404).json({ message: "Not found" });
  const file = path.join(process.cwd(), v.filePath);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  await v.deleteOne();
  res.json({ message: "Deleted" });
});

export default router;
