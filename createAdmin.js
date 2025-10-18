require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Admin = require("./models/Admin"); // if you have a models folder
// 👇 If you don’t have a separate models folder and defined Admin inside server.js, paste the schema here instead:

const adminSchema = new mongoose.Schema({
  email: String,
  password: String,
  otp: String,
  otpExpiry: Date,
});
const AdminModel = mongoose.models.Admin || mongoose.model("Admin", adminSchema);

// --------------------
// ✅ Connect to MongoDB
// --------------------
mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/clinigoal", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ Connected to MongoDB");

    const email = "admin@clinigoal.com";
    const password = "admin123";

    let admin = await AdminModel.findOne({ email });

    const hashedPassword = await bcrypt.hash(password, 10);

    if (admin) {
      admin.password = hashedPassword;
      await admin.save();
      console.log("✅ Admin password updated successfully");
    } else {
      await AdminModel.create({ email, password: hashedPassword });
      console.log("✅ New admin created successfully");
    }

    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
