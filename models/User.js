// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// ======================= User Schema =======================
const userSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['student', 'admin', 'instructor'],
      default: 'student',
    },

    // ======================= Enrolled Courses =======================
    enrolledCourses: [
      {
        courseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Course',
          required: true,
        },
        enrolledAt: {
          type: Date,
          default: Date.now,
        },
        progress: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        completedAt: Date,
        currentModule: {
          type: Number,
          default: 0,
        },
        totalModules: {
          type: Number,
          default: 0,
        },
        lastAccessed: {
          type: Date,
          default: Date.now,
        },
        quizScores: [
          {
            quizId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'Quiz',
            },
            score: Number,
            totalQuestions: Number,
            percentage: Number,
            attemptedAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],

    // ======================= Completed Courses =======================
    completedCourses: [
      {
        courseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Course',
        },
        completedAt: {
          type: Date,
          default: Date.now,
        },
        finalScore: {
          type: Number,
          min: 0,
          max: 100,
        },
        certificateId: String,
      },
    ],

    // ======================= Certificates =======================
    certificates: [
      {
        certificateId: {
          type: String,
          required: true,
        },
        courseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Course',
          required: true,
        },
        courseName: {
          type: String,
          required: true,
        },
        issueDate: {
          type: Date,
          default: Date.now,
        },
        verifyUrl: String,
        downloaded: {
          type: Boolean,
          default: false,
        },
        downloadedAt: Date,
      },
    ],

    // ======================= Profile =======================
    profile: {
      avatar: { type: String, default: '' },
      bio: { type: String, maxlength: 500 },
      phone: String,
      dateOfBirth: Date,
      address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String,
      },
    },

    // ======================= Learning Stats =======================
    learningStats: {
      totalCoursesEnrolled: { type: Number, default: 0 },
      totalCoursesCompleted: { type: Number, default: 0 },
      totalLearningHours: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      lastActive: { type: Date, default: Date.now },
    },

    // ======================= Account Security =======================
    otp: String,
    otpExpires: Date,
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,

    // ======================= Account Status =======================
    isActive: { type: Boolean, default: true },
    deactivatedAt: Date,
  },
  { timestamps: true }
);

// ======================= Password Hashing =======================
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ======================= Instance Methods =======================

// Compare Password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Enroll in Course
userSchema.methods.enrollInCourse = function (courseId, totalModules = 0) {
  const alreadyEnrolled = this.enrolledCourses.some(
    (course) => course.courseId.toString() === courseId.toString()
  );

  if (!alreadyEnrolled) {
    this.enrolledCourses.push({
      courseId,
      totalModules,
      enrolledAt: new Date(),
    });
    this.learningStats.totalCoursesEnrolled += 1;
  }

  return this.save();
};

// Update Course Progress
userSchema.methods.updateCourseProgress = function (
  courseId,
  progress,
  currentModule = 0
) {
  const idx = this.enrolledCourses.findIndex(
    (c) => c.courseId.toString() === courseId.toString()
  );

  if (idx !== -1) {
    const course = this.enrolledCourses[idx];
    course.progress = progress;
    course.currentModule = currentModule;
    course.lastAccessed = new Date();

    if (progress >= 100 && !course.completed) {
      course.completed = true;
      course.completedAt = new Date();
      this.completedCourses.push({ courseId, completedAt: new Date() });
      this.learningStats.totalCoursesCompleted += 1;
    }
  }

  return this.save();
};

// Add Quiz Score
userSchema.methods.addQuizScore = function (courseId, quizId, score, totalQuestions) {
  const percentage = (score / totalQuestions) * 100;
  const idx = this.enrolledCourses.findIndex(
    (c) => c.courseId.toString() === courseId.toString()
  );

  if (idx !== -1) {
    this.enrolledCourses[idx].quizScores.push({
      quizId,
      score,
      totalQuestions,
      percentage,
      attemptedAt: new Date(),
    });
  }

  return this.save();
};

// Add Certificate
userSchema.methods.addCertificate = function (data) {
  this.certificates.push({
    certificateId: data.certificateId,
    courseId: data.courseId,
    courseName: data.courseName,
    issueDate: data.issueDate,
    verifyUrl: data.verifyUrl,
  });

  const idx = this.completedCourses.findIndex(
    (c) => c.courseId.toString() === data.courseId.toString()
  );
  if (idx !== -1) {
    this.completedCourses[idx].certificateId = data.certificateId;
  }

  return this.save();
};

// Mark Certificate as Downloaded
userSchema.methods.markCertificateDownloaded = function (certificateId) {
  const idx = this.certificates.findIndex((c) => c.certificateId === certificateId);
  if (idx !== -1) {
    this.certificates[idx].downloaded = true;
    this.certificates[idx].downloadedAt = new Date();
  }
  return this.save();
};

// Update Learning Stats
userSchema.methods.updateLearningStats = function (learningMinutes = 0) {
  this.learningStats.totalLearningHours += learningMinutes / 60;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const last = this.learningStats.lastActive
    ? new Date(this.learningStats.lastActive)
    : null;

  if (last && last.toDateString() === yesterday.toDateString()) {
    this.learningStats.currentStreak += 1;
  } else if (!last || last.toDateString() !== today.toDateString()) {
    this.learningStats.currentStreak = 1;
  }

  this.learningStats.longestStreak = Math.max(
    this.learningStats.longestStreak,
    this.learningStats.currentStreak
  );
  this.learningStats.lastActive = today;

  return this.save();
};

// ======================= Static Methods =======================
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// ======================= Virtuals & Indexes =======================
userSchema.virtual('fullName').get(function () {
  return this.name;
});

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.otp;
  delete user.otpExpires;
  delete user.emailVerificationToken;
  return user;
};

userSchema.index({ email: 1 });
userSchema.index({ 'enrolledCourses.courseId': 1 });
userSchema.index({ 'completedCourses.courseId': 1 });
userSchema.index({ 'certificates.certificateId': 1 });


// ======================= Export =======================
export default mongoose.model('User', userSchema);
