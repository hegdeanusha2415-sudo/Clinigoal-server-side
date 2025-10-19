import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import Note from "../models/Note.js";

const router = express.Router();

/* ------------------ Ensure Upload Folder Exists ------------------ */
const uploadPath = path.join(process.cwd(), "uploads", "notes");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log("📁 Created uploads/notes directory");
}

/* ------------------ Multer Config ------------------ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});
const upload = multer({ storage });

/* ------------------ ✅ TEST ROUTE ------------------ */
router.get("/test", (req, res) => {
  res.send("📘 Note route working perfectly!");
});

/* ------------------ 📤 UPLOAD NOTE ------------------ */
router.post("/", upload.single("note"), async (req, res) => {
  try {
    const { title, courseId } = req.body;

    if (!req.file)
      return res.status(400).json({ message: "❌ No note file uploaded" });

    const note = new Note({
      title,
      courseId,
      filePath: `uploads/notes/${req.file.filename}`,
    });

    await note.save();
    res
      .status(201)
      .json({ message: "✅ Note uploaded successfully", note });
  } catch (err) {
    console.error("❌ Note upload error:", err);
    res.status(500).json({ message: "Server error during note upload" });
  }
});

/* ------------------ 📄 GET ALL NOTES ------------------ */
router.get("/", async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error("❌ Fetch notes error:", err);
    res.status(500).json({ message: "Failed to fetch notes" });
  }
});

/* ------------------ 🗑️ DELETE NOTE ------------------ */
router.delete("/:id", async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    const fullPath = path.join(process.cwd(), note.filePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    await note.deleteOne();
    res.json({ message: "🗑️ Note deleted successfully" });
  } catch (err) {
    console.error("❌ Delete note error:", err);
    res.status(500).json({ message: "Failed to delete note" });
  }
});

export default router;
