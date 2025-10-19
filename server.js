// ----------------- LOAD DEPENDENCIES -----------------
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import Razorpay from "razorpay";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

// ----------------- IMPORT ROUTES -----------------
import courseRoutes from "./routes/courseRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

// ----------------- INITIALIZE -----------------
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ----------------- MIDDLEWARES -----------------
app.use(cors({ origin: "*", credentials: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------- MONGO CONNECTION -----------------
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err.message));

// ----------------- RAZORPAY INIT -----------------
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ----------------- ROUTES -----------------
app.use("/api/courses", courseRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

// ----------------- STATIC FILES (UPLOADS) -----------------
const __dirname = path.resolve();

// Ensure uploads folder exists
const uploadDirs = ["uploads/videos", "uploads/notes"];
uploadDirs.forEach((dir) => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ----------------- ROOT TEST ROUTE -----------------
app.get("/", (req, res) => {
  res.send("🚀 Clinigoal backend is running successfully!");
});

// ----------------- ERROR HANDLING -----------------
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

// ----------------- START SERVER -----------------
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
