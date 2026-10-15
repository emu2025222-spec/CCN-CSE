
import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, Question } from "./models.js";

const app = express();
const port = Number(process.env.PORT || 5000);
const isProd = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters.");
}

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin: (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map(s => s.trim()),
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use("/api/auth/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
}));

type AuthRequest = Request & { adminId?: string };

function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.ccn_admin;

  if (!token) {
    return res.status(401).json({ message: "Admin login required." });
  }

  try {
    const payload = jwt.verify(token, jwtSecret!) as {
      sub: string;
      role: string;
    };

    if (payload.role !== "admin") {
      return res.status(403).json({ message: "Forbidden." });
    }

    req.adminId = payload.sub;
    next();
  } catch {
    return res.status(401).json({
      message: "Session expired. Please log in again."
    });
  }
}

const safeQuestion = (q: any) => ({
  _id: q._id,
  title: q.title,
  questionText: q.questionText,
  answer: q.answer,

  batch: q.batch || "18th Batch",
  semester: q.semester,
  subject: q.subject,
  courseCode: q.courseCode || "",

  examType: q.examType || "Other",
  questionType: q.questionType || "Theory",

  answerType: q.answerType || "text",
  codeLanguage: q.codeLanguage || "none",
  code: q.code || "",
  explanation: q.explanation || "",
  sampleInput: q.sampleInput || "",
  sampleOutput: q.sampleOutput || "",
  solutionSteps: Array.isArray(q.solutionSteps)
    ? q.solutionSteps
    : [],

  tags: q.tags || [],
  published: q.published,
  createdAt: q.createdAt,
  updatedAt: q.updatedAt
});

const allowedExamTypes = [
  "CT", "Midterm", "Final", "Lab", "Assignment", "Other"
];

const allowedQuestionTypes = [
  "Theory", "Math", "Programming", "Lab", "MCQ", "Other"
];

const allowedAnswerTypes = ["text", "code", "math", "mixed"];

const allowedLanguages = [
  "none", "c", "cpp", "java", "python",
  "javascript", "typescript", "sql", "other"
];

function cleanString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function validateQuestion(body: any): string[] {
  const errors: string[] = [];

  if (!cleanString(body?.title)) {
    errors.push("Title is required.");
  }

  if (!cleanString(body?.questionText)) {
    errors.push("Question text is required.");
  }

  if (!cleanString(body?.answer)) {
    errors.push("Answer is required.");
  }

  const semester = Number(body?.semester);

  if (
    !Number.isInteger(semester) ||
    semester < 1 ||
    semester > 8
  ) {
    errors.push("Semester must be 1–8.");
  }

  if (!cleanString(body?.subject)) {
    errors.push("Subject is required. Use the verified course name.");
  }

  if (
    body?.examType !== undefined &&
    !allowedExamTypes.includes(body.examType)
  ) {
    errors.push("Invalid exam type.");
  }

  if (
    body?.questionType !== undefined &&
    !allowedQuestionTypes.includes(body.questionType)
  ) {
    errors.push("Invalid question type.");
  }

  if (
    body?.answerType !== undefined &&
    !allowedAnswerTypes.includes(body.answerType)
  ) {
    errors.push("Invalid answer type.");
  }

  if (
    body?.codeLanguage !== undefined &&
    !allowedLanguages.includes(body.codeLanguage)
  ) {
    errors.push("Invalid code language.");
  }

  if (
    body?.solutionSteps !== undefined &&
    !Array.isArray(body.solutionSteps)
  ) {
    errors.push("solutionSteps must be an array.");
  }

  if (
    body?.tags !== undefined &&
    !Array.isArray(body.tags)
  ) {
    errors.push("Tags must be an array.");
  }

  return errors;
}

function questionPayload(body: any, adminId?: string) {
  const questionType = cleanString(body.questionType, "Theory");
  const inferredAnswerType =
    questionType === "Programming" ? "code" :
    questionType === "Math" ? "math" : "text";

  const payload: Record<string, any> = {
    title: cleanString(body.title),
    questionText: cleanString(body.questionText),
    answer: cleanString(body.answer),

    batch: cleanString(body.batch, "18th Batch") || "18th Batch",
    semester: Number(body.semester),
    subject: cleanString(body.subject),
    courseCode: cleanString(body.courseCode),

    examType: cleanString(body.examType, "Other"),
    questionType,

    answerType: cleanString(body.answerType, inferredAnswerType),
    codeLanguage: cleanString(body.codeLanguage, "none"),
    code: cleanString(body.code),
    explanation: cleanString(body.explanation),
    sampleInput: cleanString(body.sampleInput),
    sampleOutput: cleanString(body.sampleOutput),

    solutionSteps: Array.isArray(body.solutionSteps)
      ? body.solutionSteps
          .filter((step: unknown) => typeof step === "string")
          .map((step: string) => step.trim())
          .filter(Boolean)
          .slice(0, 50)
      : [],

    tags: Array.isArray(body.tags)
      ? body.tags
          .filter((tag: unknown) => typeof tag === "string")
          .map((tag: string) => tag.trim())
          .filter(Boolean)
          .slice(0, 15)
      : [],

    published: body.published === true
  };

  if (adminId) {
    payload.createdBy = adminId;
  }

  return payload;
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "CCN CSE HUB API" });
});

// Public filter options: generated from questions that are published.
app.get("/api/questions/filters", async (_req, res) => {
  const [batches, semesters, subjects] = await Promise.all([
    Question.distinct("batch", { published: true }),
    Question.distinct("semester", { published: true }),
    Question.distinct("subject", { published: true })
  ]);

  res.json({
    batches: batches.filter(Boolean).sort(),
    semesters: semesters.filter(Number.isFinite).sort((a, b) => a - b),
    subjects: subjects.filter(Boolean).sort()
  });
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required."
    });
  }

  const user = await User.findOne({ email });

  if (
    !user ||
    !(await bcrypt.compare(password, user.passwordHash))
  ) {
    return res.status(401).json({
      message: "Invalid email or password."
    });
  }

  const token = jwt.sign(
    { role: user.role },
    jwtSecret!,
    { subject: String(user._id), expiresIn: "8h" }
  );

  res.cookie("ccn_admin", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/"
  });

  res.json({ email: user.email, role: user.role });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("ccn_admin", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/"
  });

  res.json({ message: "Logged out." });
});

app.get(
  "/api/auth/me",
  requireAdmin,
  async (req: AuthRequest, res) => {
    const user = await User.findById(req.adminId).select("email role");

    if (!user) {
      return res.status(401).json({ message: "Admin not found." });
    }

    res.json({ email: user.email, role: user.role });
  }
);

// Public question list with batch, semester, course and type filters.
app.get("/api/questions", async (req, res) => {
  const filter: Record<string, any> = { published: true };

  const semester = Number(req.query.semester);

  if (
    req.query.semester &&
    Number.isInteger(semester) &&
    semester >= 1 &&
    semester <= 8
  ) {
    filter.semester = semester;
  }

  if (req.query.batch) {
    filter.batch = String(req.query.batch).trim();
  }

  if (req.query.subject) {
    filter.subject = String(req.query.subject).trim();
  }

  if (req.query.courseCode) {
    filter.courseCode = String(req.query.courseCode).trim();
  }

  if (req.query.examType) {
    filter.examType = String(req.query.examType);
  }

  if (req.query.questionType) {
    filter.questionType = String(req.query.questionType);
  }

  if (req.query.answerType) {
    filter.answerType = String(req.query.answerType);
  }

  const search = String(req.query.search || "").trim();

  if (search) {
    filter.$text = { $search: search };
  }

  const questions = await Question.find(filter)
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();

  res.json(questions.map(safeQuestion));
});

// Keep this route before any future generic question routes.
app.get("/api/questions/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: "Question not found." });
  }

  const q = await Question.findOne({
    _id: req.params.id,
    published: true
  }).lean();

  if (!q) {
    return res.status(404).json({ message: "Question not found." });
  }

  res.json(safeQuestion(q));
});

// Admin: view all questions, including unpublished.
app.get(
  "/api/admin/questions",
  requireAdmin,
  async (_req, res) => {
    const questions = await Question.find()
      .sort({ updatedAt: -1 })
      .limit(300)
      .lean();

    res.json(questions.map(safeQuestion));
  }
);

// Admin: create a question.
app.post(
  "/api/admin/questions",
  requireAdmin,
  async (req: AuthRequest, res) => {
    const errors = validateQuestion(req.body);

    if (errors.length) {
      return res.status(400).json({ message: errors.join(" ") });
    }

    const q = await Question.create(
      questionPayload(req.body, req.adminId)
    );

    res.status(201).json(safeQuestion(q));
  }
);

// Admin: update a question.
app.put(
  "/api/admin/questions/:id",
  requireAdmin,
  async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Question not found." });
    }

    const errors = validateQuestion(req.body);

    if (errors.length) {
      return res.status(400).json({ message: errors.join(" ") });
    }

    const q = await Question.findByIdAndUpdate(
      req.params.id,
      questionPayload(req.body),
      { new: true, runValidators: true }
    );

    if (!q) {
      return res.status(404).json({ message: "Question not found." });
    }

    res.json(safeQuestion(q));
  }
);

// Admin: delete a question.
app.delete(
  "/api/admin/questions/:id",
  requireAdmin,
  async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Question not found." });
    }

    const deleted = await Question.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Question not found." });
    }

    res.json({ message: "Question deleted." });
  }
);

async function start() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Set MONGODB_URI in server/.env");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const email = String(process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");

  if (email && password && !(await User.exists({ email }))) {
    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
      email,
      passwordHash,
      role: "admin"
    });

    console.log(
      `Initial admin created for ${email}. Change credentials securely if needed.`
    );
  }

  app.listen(port, () => {
    console.log(`CCN CSE HUB API listening on ${port}`);
  });
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
