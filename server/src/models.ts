
 // @ts-ignore Mongoose is a runtime dependency of the server project.
import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin"],
    default: "admin"
  }
}, { timestamps: true });

const questionSchema = new Schema({
  // Question information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  questionText: {
    type: String,
    required: true,
    maxlength: 20000
  },

  // Keep the existing answer field for compatibility
  answer: {
    type: String,
    required: true,
    maxlength: 50000
  },

  // Batch and semester organization
  batch: {
    type: String,
    trim: true,
    default: "18th Batch",
    maxlength: 40
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },

  // Course information
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 160
  },
  courseCode: {
    type: String,
    trim: true,
    default: "",
    maxlength: 40
  },

  // Question classification
  examType: {
    type: String,
    enum: ["CT", "Midterm", "Final", "Lab", "Assignment", "Other"],
    default: "Other"
  },
  questionType: {
    type: String,
    enum: ["Theory", "Math", "Programming", "Lab", "MCQ", "Other"],
    default: "Theory"
  },

  // Structured answer information
  answerType: {
    type: String,
    enum: ["text", "code", "math", "mixed"],
    default: "text"
  },
  codeLanguage: {
    type: String,
    enum: ["none", "c", "cpp", "java", "python", "javascript", "typescript", "sql", "other"],
    default: "none"
  },
  code: {
    type: String,
    default: "",
    maxlength: 50000
  },
  explanation: {
    type: String,
    default: "",
    maxlength: 20000
  },
  sampleInput: {
    type: String,
    default: "",
    maxlength: 10000
  },
  sampleOutput: {
    type: String,
    default: "",
    maxlength: 10000
  },

  // Optional math-friendly answer text.
  // Store formulas as text/LaTeX; frontend rendering will be added separately.
  solutionSteps: [{
    type: String,
    trim: true,
    maxlength: 10000
  }],

  tags: [{
    type: String,
    trim: true,
    maxlength: 40
  }],

  published: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

// Searchable fields
questionSchema.index({
  title: "text",
  questionText: "text",
  answer: "text",
  subject: "text",
  tags: "text",
  code: "text"
});

// Efficient filters for batch, semester and course
questionSchema.index({
  batch: 1,
  semester: 1,
  subject: 1,
  published: 1
});

export const User = mongoose.model("User", userSchema);
export const Question = mongoose.model("Question", questionSchema);
