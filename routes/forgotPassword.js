const nodemailer = require("nodemailer");
const User = require("./models/User"); // your user model
let otpStore = {}; // temporary OTP storage

// Send OTP
app.post("/api/forgot-password/send-otp", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "Email not found" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = otp;

  // Send OTP via email
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP for Password Reset",
    text: `Your OTP is ${otp}`,
  });

  res.json({ message: "OTP sent to your email" });
});

// Verify OTP
app.post("/api/forgot-password/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (otpStore[email] && otpStore[email] === otp) {
    delete otpStore[email]; // remove OTP after success
    res.json({ message: "OTP verified" });
  } else {
    res.status(400).json({ message: "Invalid OTP" });
  }
});

// Reset Password
app.post("/api/forgot-password/reset", async (req, res) => {
  const { email, newPassword } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  user.password = newPassword; // hash password in production
  await user.save();
  res.json({ message: "Password updated successfully" });
});
