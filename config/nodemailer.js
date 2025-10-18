// config/nodemailer.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// ✅ Create reusable transporter
export const transporter = nodemailer.createTransport({
  service: "gmail", // or use "smtp.mailtrap.io" for testing
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Send mail function
export const sendMail = async (to, subject, htmlContent) => {
  try {
    const mailOptions = {
      from: `"My App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);
    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return false;
  }
};
