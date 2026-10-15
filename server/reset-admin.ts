import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "./src/models.js";

async function main() {
  const email = String(process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();

  const password = String(process.env.ADMIN_PASSWORD || "");

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from server/.env");
  }

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL or ADMIN_PASSWORD is missing from server/.env");
  }

  if (password.length < 12) {
    throw new Error("Use a new, strong password of at least 12 characters.");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOne({ email });

  if (!user) {
    throw new Error(
      `Admin account ${email} was not found. No account was changed.`
    );
  }

  if (user.role !== "admin") {
    throw new Error(
      `Account ${email} is not an admin. No account was changed.`
    );
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  await user.save();

  console.log(`Password reset successfully for ${email}.`);
}

main()
  .catch((error) => {
    console.error("Password reset failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });